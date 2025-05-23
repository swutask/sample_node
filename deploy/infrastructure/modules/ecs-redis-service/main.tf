resource "aws_cloudwatch_log_group" "this_log_group" {
  name              = var.log_group_name
  retention_in_days = 14
}

data "template_file" "task_definition_json" {
  template = "${file("./task_definition.json")}"
  vars = {
    app_name           = "${var.app_name}"
    image              = "${var.image}"
    aws_region         = "${var.aws_region}"
    log_group          = "${aws_cloudwatch_log_group.this_log_group.name}"
    REDIS_PASS         = "2WAAHr4551"
    networkMode        = "awsvpc"
  }
}


resource "aws_ecs_task_definition" "this_task_definition" {
  depends_on = [
    data.template_file.task_definition_json
  ]
  family = var.app_name
  execution_role_arn = "${var.role_arn}"
  network_mode = "awsvpc"
  container_definitions = "${data.template_file.task_definition_json.rendered}"
}

resource "aws_ecs_service" "this_task_service" {
  depends_on = [
    aws_ecs_task_definition.this_task_definition,
    aws_service_discovery_service.main
  ]
  name            = "${var.app_name}-service"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this_task_definition.arn

  network_configuration {
    subnets =   ["subnet-05bb5a17258eef976",  "subnet-068bfd4999da7c29b",  "subnet-0f2779ce762d66cf0"]
    security_groups = ["sg-04bc49ba0b0aff7f9"]
    assign_public_ip = false
  }


  capacity_provider_strategy {
    base = var.desired_count
    capacity_provider = var.capacity_provider_name
    weight = 100
  }
  service_registries {
    registry_arn   = aws_service_discovery_service.main.arn
    container_name = "redis-test"
  }

  desired_count = var.desired_count
  force_new_deployment = true

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 50
}


resource "aws_service_discovery_private_dns_namespace" "local" {
  name        = "helloivy.services"
  description = "for ECS services"
  vpc         = var.vpc_id
}

resource "aws_service_discovery_service" "main" {
  name = "redis-test"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.local.id

    dns_records {
      ttl  = 10
      type = "A"
    }
  }
}

data "aws_ecs_service" "this" {
  depends_on = [
    aws_ecs_task_definition.this_task_definition
  ]
  service_name = aws_ecs_service.this_task_service.name
  cluster_arn  = var.cluster_arn
}