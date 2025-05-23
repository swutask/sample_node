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
  cluster_name           = "helloivy-production"
  cluster_id             = "arn:aws:ecs:eu-central-1:944000130876:cluster/helloivy-production"
  cluster_arn            = "arn:aws:ecs:eu-central-1:944000130876:cluster/helloivy-production"
  log_group_name         = "${local.environment_vars.locals.project}-${local.environment_vars.locals.environment}"
  app_name               = "${local.environment_vars.locals.project}-${local.environment_vars.locals.environment}"
  role_arn               = "arn:aws:iam::944000130876:role/ecs/helloivy-production-ec2-instance-role"
  alb_target_group       = "arn:aws:elasticloadbalancing:eu-central-1:944000130876:targetgroup/cstage20240425105330368300000001/e00ea9fc8d001155"
  node_env               = local.environment_vars.locals.environment
  container_port         = local.environment_vars.locals.back_end_port
  aws_region             = local.region_vars.locals.aws_region
  image                  = dependency.ecr.outputs.repository_url
  desired_count          = local.environment_vars.locals.min_size
  back_end_port          = local.environment_vars.locals.back_end_port
  health_check_path      = local.environment_vars.locals.health_path
  max_size               = local.environment_vars.locals.max_size
  min_size               = local.environment_vars.locals.min_size
  capacity_provider_name = "cp-production"
}


include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../ecr"]
}

dependency "ecr" {
  config_path = "../ecr"
}