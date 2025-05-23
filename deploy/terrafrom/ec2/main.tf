provider "aws" {
  region = var.region
}

#---------------------------------------------------------------------------------------------------------------------
terraform {
  backend "s3" {
    bucket = "helloivy-co-infrastructure" 
    key    = "test/ec2/terraform.tfstate"
    region = "eu-central-1"               
  }
}

data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "helloivy-co-infrastructure"           
    key    = "test/network/terraform.tfstate"  
    region = "eu-central-1"                      
  }
}

#-------------------------------------------------------------------------------------------------------------
locals {
  subs = concat([data.terraform_remote_state.network.outputs.public_subnet_ids[0]], [data.terraform_remote_state.network.outputs.public_subnet_ids[1]])
}


data "aws_ami" "latest_ubuntu" {
  owners      = ["099720109477"]
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*"]
  }
}

resource "aws_key_pair" "main" {
  key_name   = "main-key"
  public_key = "${var.ssh_key}"
}


data "aws_availability_zones" "avalible" {}

#-------------------------------------------------------------------------------------------------------------

resource "aws_security_group" "backend" {
  name   = "${var.common_tags["Environment"]} ${var.common_tags["Project"]} Backend Port Security Group"
  vpc_id = "${data.terraform_remote_state.network.outputs.vpc_id}"
  description = "Allow inbound traffic from ELB for back end"

  ingress {
    protocol    = "tcp"
    from_port   = "${var.node_port}"
    to_port     = "${var.node_port}"
    cidr_blocks = ["${data.terraform_remote_state.network.outputs.subnet_cidr[0]}", "${data.terraform_remote_state.network.outputs.subnet_cidr[1]}"]
  }
  # outcoming rule
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, { Name = "${var.common_tags["Environment"]}-SecurityGroup" })
}

resource "aws_security_group" "ssh" {
  name   = "${var.common_tags["Environment"]} ${var.common_tags["Project"]} ssh Security Group"
  vpc_id = "${data.terraform_remote_state.network.outputs.vpc_id}"
  description = "Allow inbound traffic for ssh"

  ingress {
    protocol    = "tcp"
    from_port   = "${var.ssh_port}"
    to_port     = "${var.ssh_port}"
    cidr_blocks = ["0.0.0.0/0"]
  }
  # outcoming rule
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, { Name = "${var.common_tags["Environment"]}-ssh-SecurityGroup" })
}

#-------------------------------------------------------------------------------------------------------------
resource "aws_instance" "backend" {
  count                  = 1
  ami                    = data.aws_ami.latest_ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.main.key_name
  iam_instance_profile   = aws_iam_instance_profile.instance_profile.name
  vpc_security_group_ids = ["${aws_security_group.backend.id}","${aws_security_group.ssh.id}"]
  #user_data              = data.template_file.user_data_1.rendered
  subnet_id              = element(local.subs, count.index)
  tags = merge(var.common_tags, {
    Name = "Backend-${var.common_tags["Environment"]}-${count.index + 1}",
    Project = "${var.common_tags["Project"]}" })
}


resource "aws_eip_association" "eip" {
  count = length(aws_instance.backend)
  instance_id   = aws_instance.backend[count.index].id
  allocation_id = data.terraform_remote_state.network.outputs.pub_id[count.index]
}


# Identity and Access Management (IAM)
resource "aws_iam_role" "iam_role" {
  name = "iam_role"
  tags = merge(var.common_tags, {
    Name = "IAM role for EC2"
  })

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "ec2.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_policy" "iam_policy" {
  name        = "${var.common_tags["Environment"]}-iam-policy"
  path        = "/"
  description = "${var.common_tags["Environment"]} IAM Policy"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "ec2:Describe*"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "attach_iam_policy" {
  role       = aws_iam_role.iam_role.name
  policy_arn = aws_iam_policy.iam_policy.arn
}

resource "aws_iam_instance_profile" "instance_profile" {
  name = "${var.common_tags["Environment"]}-instance-profile"
  role = aws_iam_role.iam_role.name
}

#-------------------------------------------------------------------------------------------------------------
