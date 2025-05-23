resource "aws_cloudwatch_log_group" "this_log_group" {
  name              = var.log_group_name
  retention_in_days = 14
}

data "template_file" "task_definition_json" {
  template = "${file("./task_definition.json")}"
  vars = {
    app_name           = "${var.app_name}"
    image              = "${var.image}"
    node_env           = "${var.node_env}"
    time_zone          = "UTC"
    back_end_port      = var.back_end_port
    health_check_path  = "${var.back_end_port}${var.health_check_path}"
    aws_region         = "${var.aws_region}"
    log_group          = "${aws_cloudwatch_log_group.this_log_group.name}"
  }
}


resource "aws_ecs_task_definition" "this_task_definition" {
  depends_on = [
    data.template_file.task_definition_json
  ]
  family = var.app_name
  execution_role_arn = "${var.role_arn}"
  container_definitions = "${data.template_file.task_definition_json.rendered}"
}

resource "aws_ecs_service" "this_task_service" {
  depends_on = [
    aws_ecs_task_definition.this_task_definition
  ]
  name            = "${var.app_name}-service"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.this_task_definition.arn

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  capacity_provider_strategy {
    base = var.min_size
    capacity_provider = var.capacity_provider_name
    weight = 100

  }

  load_balancer {
    target_group_arn = var.alb_target_group
    container_name = aws_ecs_task_definition.this_task_definition.family
    container_port = var.back_end_port

  }

  desired_count = var.desired_count
  force_new_deployment = true

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 50
}


resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = var.max_size
  min_capacity       = var.min_size
  resource_id        = "service/${var.cluster_name}/${aws_ecs_service.this_task_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_target_cpu" {
  name               = "application-scaling-policy-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 80
  }
  depends_on = [aws_appautoscaling_target.ecs_target]
}

resource "aws_appautoscaling_policy" "ecs_target_memory" {
  name               = "application-scaling-policy-memory"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80
  }
  depends_on = [aws_appautoscaling_target.ecs_target]
}

data "aws_ecs_service" "this" {
  depends_on = [
    aws_ecs_task_definition.this_task_definition
  ]
  service_name = aws_ecs_service.this_task_service.name
  cluster_arn  = var.cluster_arn
}