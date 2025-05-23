resource "aws_cloudwatch_log_group" "this_log_group" {
  name              = var.log_group_name
  retention_in_days = 14
}

# data "aws_ecs_task_definition" "this_task_definition" {
#   task_definition = aws_ecs_task_definition.this_task_definition.family
# }


resource "aws_ecs_task_definition" "this_task_definition" {
  family = var.app_name
  execution_role_arn = "${var.role_arn}"
  network_mode = "bridge"
  container_definitions = jsonencode([
{
	name: "${var.app_name}",
	image: "${var.image}",
	memory: var.memory,
	command: [
		"sh",
		"-c",
		"${var.command}"],
  environment: [
                {
                    name: "NODE_ENV",
                    value: "${var.node_env}"
                },
                {
									name: "TZ",
									value: "UTC"
							  },
                {
                    name: "NODE_OPTIONS",
                    value: "--max_old_space_size=${var.memory}"
                }
            ],
	logConfiguration: {
		logDriver: "awslogs",
		options: {
			awslogs-region: "${var.aws_region}",
			awslogs-group: "${aws_cloudwatch_log_group.this_log_group.name}",
			awslogs-stream-prefix: "${var.app_name}"
		  }
	  }
  }
  ])

lifecycle {
    create_before_destroy = true
  }
}

resource "aws_ecs_service" "this_task_service" {
  name            = "${var.app_name}-service"
  cluster         = var.cluster_arn
  task_definition = "${aws_ecs_task_definition.this_task_definition.family}:${max("${aws_ecs_task_definition.this_task_definition.revision}")}"

  lifecycle {
    #create_before_destroy = true
    ignore_changes        = [task_definition]
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  capacity_provider_strategy {
    base = var.min_size
    capacity_provider = var.capacity_provider_name
    weight = 100
  }

ordered_placement_strategy {
           field = "memory" 
           type  = "binpack"
  }

  # service_registries {
  #   registry_arn   = aws_service_discovery_service.this.arn
  #   container_name = aws_ecs_task_definition.this_task_definition.family
  #   container_port = var.metrics_port
  # }

  desired_count = var.desired_count
  force_new_deployment = true

  deployment_maximum_percent         = 100
  deployment_minimum_healthy_percent = 0

  depends_on = [
    aws_ecs_task_definition.this_task_definition,
    #aws_service_discovery_service.this
   ]
}

# resource "aws_service_discovery_service" "this" {
#   name = "${var.app_name}"
#   dns_config {
#     namespace_id = var.namespace_id
#     dns_records {
#       ttl  = 10
#       type = "SRV"
#     }
#   }
#   tags = {
#     "METRICS_PATH" = var.metrics_path,
#     "METRICS_PORT" = var.metrics_port
#   }
# }

# resource "aws_cloudwatch_event_rule" "task_failure" {
#   name        = "${var.app_name}-fail"
#   description = "Watch for ${var.app_name} tasks that exit with non zero exit codes"

#   event_pattern = <<EOF
#   {
#     "source": [
#       "aws.ecs"
#     ],
#     "detail-type": [
#       "ECS Task State Change"
#     ],
#     "detail": {
#       "lastStatus": [
#         "STOPPED"
#       ],
#       "stoppedReason": [
#         "Essential container in task exited"
#       ],
#       "containers": {
#         "name": ["${var.app_name}"],
#          "exitCode": [
#           {"anything-but": 0}
#         ]
#       },
#       "clusterArn": ["${var.cluster_arn}"]
#     }
#   }
#   EOF
# }


# resource "aws_sns_topic" "task_failure" {
#   name = "${var.app_name}-fail"
# }

# resource "aws_cloudwatch_event_target" "sns_target" {
#   rule  = aws_cloudwatch_event_rule.task_failure.name
#   arn   = aws_sns_topic.task_failure.arn
#   input = jsonencode({ "message" : "Task ${var.app_name} failed! Please check logs https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups/log-group/${var.app_name} " })
# }

# data "aws_iam_policy_document" "task_failure" {

#   statement {
#     actions   = ["SNS:Publish"]
#     effect    = "Allow"
#     resources = [aws_sns_topic.task_failure.arn]

#     principals {
#       type        = "Service"
#       identifiers = ["events.amazonaws.com"]
#     }
#   }
# }

# resource "aws_sns_topic_policy" "task_failure" {
#   arn    = aws_sns_topic.task_failure.arn
#   policy = data.aws_iam_policy_document.task_failure.json
# }

# resource "aws_sns_topic_subscription" "lambda_alarm" {
#   topic_arn =  aws_sns_topic.task_failure.arn
#   protocol  = "lambda"
#   endpoint  =  var.lambda_endpoint
# }

