provider "aws" {
  region = var.region
}

terraform {
  backend "s3" {
    bucket = "helloivy-co-infrastructure"    // Bucket where to SAVE Terraform State
    key    = "test/network/terraform.tfstate" // Object name in the bucket to SAVE Terraform State
    region = "eu-central-1"                      // Region where bucket created
  }
}

#==============================================================#======================================================

data "aws_availability_zones" "available" {}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  enable_dns_hostnames = true
  tags = {
    Name    = "${var.env}-vpc"
    Project = "${var.project}"
    Region  = "${var.region}"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name    = "${var.env}-igw"
    Project = "${var.project}"
  }
}


resource "aws_subnet" "public_subnets" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = element(var.public_subnet_cidrs, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name    = "${var.env}-public-${count.index + 1}"
    Project = "${var.project}"
  }
}


resource "aws_route_table" "public_subnets" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = {
    Name    = "${var.env}-route-public-subnets"
    Project = "${var.project}"
  }
}

resource "aws_route_table_association" "public_routes" {
  count          = length(aws_subnet.public_subnets[*].id)
  route_table_id = aws_route_table.public_subnets.id
  subnet_id      = element(aws_subnet.public_subnets[*].id, count.index)
}


resource "aws_eip" "main" {
  #instance   = "${element(aws_instance.staging.*.id,count.index)}"
  count = "1"
  vpc = true
  depends_on = [aws_subnet.public_subnets]
  tags = {
    Name = "eip-${var.env}-${count.index + 1}"
  }
  lifecycle {
    prevent_destroy = false
  }
}
