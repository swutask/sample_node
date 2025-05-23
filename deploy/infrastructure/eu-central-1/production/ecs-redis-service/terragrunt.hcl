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
  source = "${get_parent_terragrunt_dir()}//infrastructure/modules/ecs-redis-service"
}

inputs = {
  cluster_name           = dependency.ecs.outputs.ecs_cluster_name
  log_group_name         = "redis-test"
  app_name               = "redis-test"
  role_arn               = dependency.ec2-profile.outputs.aws_iam_role_arn
  aws_region             = local.region_vars.locals.aws_region
  cluster_id             = dependency.ecs.outputs.ecs_cluster_id
  cluster_arn            = dependency.ecs.outputs.ecs_cluster_arn
  image                  = "redis:6.2.1-alpine"
  desired_count          = 1
  capacity_provider_name = dependency.ecs-capacity-provider.outputs.name
  vpc_id                 = dependency.vpc.outputs.vpc_id
}


include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../ecs", "../ecs-capacity-provider", "../ec2-profile", "../vpc" ]
}

dependency "ecs" {
  config_path = "../ecs"
}

dependency "ec2-profile" {
  config_path = "../ec2-profile"
}

dependency "ecs-capacity-provider" {
  config_path = "../ecs-capacity-provider"
}

dependency "vpc" {
  config_path = "../vpc"
}