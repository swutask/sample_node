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
  source = "${get_parent_terragrunt_dir()}/infrastructure/modules/ec2-instance-profile"
}

inputs = {
  name        = "${local.environment_vars.locals.project}-${local.environment_vars.locals.environment}"
}


include {
  path = find_in_parent_folders()
}
