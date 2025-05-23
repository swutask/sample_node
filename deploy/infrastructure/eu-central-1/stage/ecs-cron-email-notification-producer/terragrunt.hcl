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
  log_group_name                 = "complex-email-producer-stage"
  app_name                       = "complex-email-producer-stage"
  cloudwatch_schedule_expression = "cron(0 * ? * 5 *)"
  node_env                       = "staging"
  command                        = "node src/jobs/email-notification-producer.js"
  ecr_repo_name                  = dependency.ecr.outputs.repository_name
  cluster_arn                    = "arn:aws:ecs:eu-central-1:944000130876:cluster/helloivy-production"
  ecs_task_execution_role_name   = "helloivy-production-ec2-instance-role"
  //subnet_ids                     = flatten([dependency.vpc.outputs.public_subnets])
  task_cpu                       = 128
  task_memory                    = 128
  task_name                      = "complex-email-producer-stage"
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

