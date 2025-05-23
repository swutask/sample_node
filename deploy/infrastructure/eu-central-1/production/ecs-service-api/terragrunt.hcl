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
  source = "${get_parent_terragrunt_dir()}//infrastructure/modules/ecs-service"
}

inputs = {
  cluster_name           = dependency.ecs.outputs.ecs_cluster_name
  log_group_name         = "${local.environment_vars.locals.project}-${local.environment_vars.locals.environment}"
  app_name               = "${local.environment_vars.locals.project}-${local.environment_vars.locals.environment}"
  alb_target_group       = dependency.alb.outputs.target_group_arns[0]
  node_env               = "production"
  container_port         = local.environment_vars.locals.back_end_port
  role_arn               = dependency.ec2-profile.outputs.aws_iam_role_arn
  aws_region             = local.region_vars.locals.aws_region
  cluster_id             = dependency.ecs.outputs.ecs_cluster_id
  cluster_arn            = dependency.ecs.outputs.ecs_cluster_arn
  image                  = dependency.ecr.outputs.repository_url
  desired_count          = local.environment_vars.locals.min_size
  back_end_port          = local.environment_vars.locals.back_end_port
  health_check_path      = local.environment_vars.locals.health_path
  max_size               = local.environment_vars.locals.max_size
  min_size               = local.environment_vars.locals.min_size
  capacity_provider_name = dependency.ecs-capacity-provider.outputs.name
}


include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../ecs", "../ecr", "../alb" , "../ecs-capacity-provider", "../ec2-profile" ]
}

dependency "ecs" {
  config_path = "../ecs"
}

dependency "alb" {
  config_path = "../alb"
}

dependency "ecr" {
  config_path = "../ecr"
}

dependency "ec2-profile" {
  config_path = "../ec2-profile"
}
dependency "ecs-capacity-provider" {
  config_path = "../ecs-capacity-provider"
}