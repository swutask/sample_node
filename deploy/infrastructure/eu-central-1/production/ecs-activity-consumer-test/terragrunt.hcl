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
  log_group_name         = "activity-consumer-test"
  app_name               = "activity-consumer-test"
  node_env               = "test"
  role_arn               = dependency.ec2-profile.outputs.aws_iam_role_arn
  aws_region             = local.region_vars.locals.aws_region
  cluster_arn            = dependency.ecs.outputs.ecs_cluster_arn
  image                  = dependency.ecr-test.outputs.repository_url
  desired_count          = 1
  min_size               = 1
  capacity_provider_name = dependency.ecs-capacity-provider.outputs.name
  command                = "node src/jobs/activity-consumer.js"
  subnets                = dependency.vpc.outputs.public_subnets
  memory                 = 128
}


include {
  path = find_in_parent_folders()
}

dependencies {
  paths = ["../ecs", "../ecr-test",  "../ec2-profile", "../ecs-capacity-provider", "../sg-ec2", "../vpc" ]
}


dependency "ecs" {
  config_path = "../ecs"
}

dependency "ecr-test" {
  config_path = "../ecr-test"
}

dependency "ecs-capacity-provider" {
  config_path = "../ecs-capacity-provider"
}

dependency "ec2-profile" {
  config_path = "../ec2-profile"
}


dependency "sg-ec2" {
  config_path = "../sg-ec2"
}

dependency "vpc" {
  config_path = "../vpc"
}