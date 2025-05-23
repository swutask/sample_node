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
  source = "${get_parent_terragrunt_dir()}/infrastructure/modules/asg-scaling-policy"
}

inputs = {
  name                                    = "${local.environment_vars.locals.project}-${local.environment_vars.locals.environment}"
  asg_name                                = dependency.asg.outputs.this_autoscaling_group_name
  cpu_utilization_high_threshold_percent  = local.environment_vars.locals.max_cpu_percent
  cpu_utilization_high_period_seconds     = local.environment_vars.locals.period_seconds

}


include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../asg"]
}

dependency "asg" {
  config_path = "../asg"
}