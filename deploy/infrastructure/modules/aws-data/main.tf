locals {
  # Use existing (via data source) or create new zone (will fail validation, if zone is not reachable)
  use_existing_route53_zone = true

  # Removing trailing dot from domain - just to be sure :)
  domain_name = trimsuffix(var.domain, ".")
}

data "aws_region" "selected" {}

data "aws_availability_zones" "available" {}


data "aws_ami" "ubuntu_1804" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu-minimal/images/*/ubuntu-bionic-18.04-*"]
  }
}