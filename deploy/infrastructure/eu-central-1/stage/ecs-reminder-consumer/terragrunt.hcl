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
  source = "${get_parent_terragrunt_dir()}//infrastructure/modules/ecs-job"
}

inputs = {
  cluster_name           = "helloivy-production"
  cluster_id             = "arn:aws:ecs:eu-central-1:944000130876:cluster/helloivy-production"
  cluster_arn            = "arn:aws:ecs:eu-central-1:944000130876:cluster/helloivy-production"
  log_group_name         = "${local.environment_vars.locals.project}-${local.environment_vars.locals.environment}-reminder-consumer"
  app_name               = "${local.environment_vars.locals.project}-${local.environment_vars.locals.environment}-reminder-consumer"
  role_arn               = "arn:aws:iam::944000130876:role/ecs/helloivy-production-ec2-instance-role"
  node_env               = local.environment_vars.locals.environment
  aws_region             = local.region_vars.locals.aws_region
  image                  = dependency.ecr.outputs.repository_url
  desired_count          = 1
  max_size               = 1
  min_size               = 1
  capacity_provider_name = "cp-production"
  command                = "node src/jobs/reminder-consumer.js"
  memory                 = 128
}


include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../ecr" ]
}


dependency "ecr" {
  config_path = "../ecr"
}