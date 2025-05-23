provider "aws" {
  region = var.region
}


terraform {
  backend "s3" {
    bucket = "helloivy-co-infrastructure"      // Bucket where to SAVE Terraform State
    key    = "test/db/terraform.tfstate"    // Object name in the bucket to SAVE Terraform State
    region = "eu-central-1"               // Region where bycket created
  }
}


data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "helloivy-co-infrastructure"           // Bucket from where to GET Terraform State
    key    = "test/network/terraform.tfstate"    // Object name in the bucket to GET Terraform state
    region = "eu-central-1"                        // Region where bycket created
  }
}


resource "aws_security_group" "rds" {
  name   = "RDS Security Group for PostgresSQL"
  vpc_id = "${data.terraform_remote_state.network.outputs.vpc_id}"

  ingress {
    protocol    = "tcp"
    from_port   = "5432"
    to_port     = "5432"
    cidr_blocks = ["${data.terraform_remote_state.network.outputs.vpc_cidr}"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "default" {
  name = "main-subnet-grp"
  subnet_ids = [
    "${data.terraform_remote_state.network.outputs.public_subnet_ids[0]}",
    "${data.terraform_remote_state.network.outputs.public_subnet_ids[1]}",
  ]
}


// Generate Password
resource "random_string" "rds_password" {
  length           = 12
  special          = true
  override_special = "!#$&"

  keepers = {
    kepeer1 = var.passwordkeeper
  }
}

// Store Password in SSM Parameter Store
resource "aws_ssm_parameter" "rds_password" {
  name        = "/${var.common_tags["Environment"]}/postgresql"
  description = "Master Password for RDS PostgreSQL"
  type        = "SecureString"
  value       = random_string.rds_password.result
}

// Get Password from SSM Parameter Store
data "aws_ssm_parameter" "main_rds_password" {
  name       = "/${var.common_tags["Environment"]}/postgresql"
  depends_on = [aws_ssm_parameter.rds_password]
}


// Example of Use Password in RDS
resource "aws_db_instance" "main" {
  identifier                 = "${var.common_tags["Environment"]}rds"
  allocated_storage          = 20
  storage_type               = "gp2"
  engine                     = "postgres"
  engine_version             = "11.7"
  instance_class             = "${var.instance_type}"
  name                       = "${var.common_tags["Environment"]}db"
  username                   = "administrator"
  password                   = data.aws_ssm_parameter.main_rds_password.value
  backup_retention_period    = "7"
  backup_window              = "03:00-06:00"
  maintenance_window         = "Mon:00:00-Mon:03:00"
  skip_final_snapshot        = true
  apply_immediately          = true
  auto_minor_version_upgrade = true
  vpc_security_group_ids     = [aws_security_group.rds.id]
  db_subnet_group_name       = "${aws_db_subnet_group.default.name}"
}
