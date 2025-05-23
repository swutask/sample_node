# aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com
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
  source = "${get_parent_terragrunt_dir()}//infrastructure/modules/ecs-capacity-provider"
}

inputs = {
  name                  = "cp-${local.environment_vars.locals.environment}"
  min_size              = local.environment_vars.locals.min_size
  max_size              = local.environment_vars.locals.max_size
  autoscaling_group_arn = dependency.asg.outputs.autoscaling_group_arn
  
}


include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../asg" ]
}

dependency "asg" {
  config_path = "../asg"
}
