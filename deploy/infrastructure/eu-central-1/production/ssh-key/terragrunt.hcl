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
  source = "git::git@github.com:terraform-aws-modules/terraform-aws-key-pair.git?ref=v0.4.0"
}

inputs = {

key_name   = "${local.env}-${local.project}"
public_key = "${file("${local.environment_vars.locals.public_key_location}")}"

}

include {
  path = find_in_parent_folders()
}