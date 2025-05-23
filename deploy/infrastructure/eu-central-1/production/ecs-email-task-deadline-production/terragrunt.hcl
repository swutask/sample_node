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
  source = "${get_parent_terragrunt_dir()}//infrastructure/modules/ecs-cronjob"
}
inputs = {
  aws_region                     = local.region_vars.locals.aws_region
  log_group_name                 = "email-task-deadline-prod"
  app_name                       = "email-task-deadline-prod"
  cloudwatch_schedule_expression = "cron(0 0/1 ? * * *)"
  node_env                       = "production"
  command                        = "node src/jobs/email-task-deadline-notification-producer.js"
  ecr_repo_name                  = dependency.ecr.outputs.repository_name
  ecs_cluster_arn                = dependency.ecs.outputs.ecs_cluster_arn
  ecs_task_execution_role_name   = "helloivy-production-ec2-instance-role"
  subnet_ids                     = flatten([dependency.vpc.outputs.public_subnets])
  task_cpu                       = 512
  task_memory                    = 256
  task_name                      = "email-task-deadline-prod"
}


include {
  path = find_in_parent_folders()
}


dependencies {
  paths = ["../ecr", "../ecs", "../ec2-profile", "../vpc" ]
}

dependency "vpc" {
  config_path = "../vpc"
}

dependency "ecr" {
  config_path = "../ecr"
}

dependency "ecs" {
  config_path = "../ecs"
}

dependency "ec2-profile" {
  config_path = "../ec2-profile"
}

