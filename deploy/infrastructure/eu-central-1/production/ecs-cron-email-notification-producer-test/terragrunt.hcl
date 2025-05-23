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
  log_group_name                 = "email-notification-producer-test"
  app_name                       = "email-notification-producer-test"
  cloudwatch_schedule_expression = "cron(0 * ? * 5 *)"
  node_env                       = "test"
  command                        = "node src/jobs/email-notification-producer.js"
  ecr_repo_name                  = dependency.ecr-test.outputs.repository_name
  ecs_cluster_arn                = dependency.ecs.outputs.ecs_cluster_arn
  ecs_task_execution_role_name   = "helloivy-production-ec2-instance-role"
  subnet_ids                     = flatten([dependency.vpc.outputs.public_subnets])
  task_cpu                       = 128
  task_memory                    = 128
  task_name                      = "email-notification-producer-test"
}


include {
  path = find_in_parent_folders()
}


dependencies {
  paths = ["../ecr-test", "../ecs", "../ec2-profile", "../vpc" ]
}

dependency "vpc" {
  config_path = "../vpc"
}

dependency "ecr-test" {
  config_path = "../ecr-test"
}

dependency "ecs" {
  config_path = "../ecs"
}

dependency "ec2-profile" {
  config_path = "../ec2-profile"
}

