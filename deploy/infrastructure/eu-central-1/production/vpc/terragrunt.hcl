
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
   source = "git::git@github.com:terraform-aws-modules/terraform-aws-vpc.git?ref=v2.44.0"
}

include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../aws-data"]
}

dependency "aws-data" {
  config_path = "../aws-data"
}

# MODULE PARAMETERS
inputs = {
   name = "${local.env}-${local.project}"
   
   cidr = "10.0.0.0/16"
   
   azs = [for v in dependency.aws-data.outputs.available_aws_availability_zones_names: v]
   public_subnets = [for k,v in dependency.aws-data.outputs.available_aws_availability_zones_names: cidrsubnet("10.0.0.0/16", 8, k)]
   
   enable_dns_support = true
   enable_dns_hostnames = true
}