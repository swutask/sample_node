locals {
   # Automatically load environment-level variables
   environment_vars = read_terragrunt_config(find_in_parent_folders("env.hcl"))
   region_vars = read_terragrunt_config(find_in_parent_folders("region.hcl"))   
   # Extract out common variables for reuse
   env        = local.environment_vars.locals.environment
   project    = local.environment_vars.locals.project
   aws_region = local.region_vars.locals.aws_region
}

terraform {
  source = "git::git@github.com:terraform-aws-modules/terraform-aws-security-group.git?ref=v3.1.0"
}

###########################################################
# View all available inputs for this module:
# https://registry.terraform.io/modules/terraform-aws-modules/security-group/aws/3.1.0?tab=inputs
###########################################################
inputs = {
  # List of IPv4 CIDR ranges to use on all ingress rules
  # type: list(string)

  # List of ingress rules to create by name
  # type: list(string)
  ingress_cidr_blocks = [dependency.vpc.outputs.vpc_cidr_block]
  egress_cidr_blocks  = ["0.0.0.0/0"]

  ingress_rules = ["postgresql-tcp"]
  egress_rules  = ["postgresql-tcp"]

  # Name of security group
  # type: string
  name = "${local.env}-${local.project}-rds"

  # ID of the VPC where to create security group
  # type: string
  vpc_id = dependency.vpc.outputs.vpc_id

}

include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../vpc"]
}

dependency "vpc" {
  config_path = "../vpc"
}