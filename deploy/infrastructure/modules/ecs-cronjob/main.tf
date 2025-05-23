data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

resource "aws_cloudwatch_log_group" "this_log_group" {
  name              = var.log_group_name
  retention_in_days = 14
}


// ECS Task definition
// -------------------
// We use a terraform map object and serialize to Json to allow end-users to pass their custom task definition
// parameters as a variable to the module.  We only specify the minimum values needed to run the task and configure
// Cloudwatch logging
data "aws_ecr_repository" "existing" {
  name = var.ecr_repo_name
}

resource "aws_ecs_task_definition" "this" {
  family = var.app_name
  execution_role_arn = "${var.task_role_arn}"
    container_definitions = jsonencode([
{
	name: "${var.app_name}",
	image: "${data.aws_ecr_repository.existing.repository_url}:latest",
	memory: var.task_memory,
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
                    value: "--max_old_space_size=${var.task_memory}"
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

// Cloudwatch trigger
// ------------------
resource "aws_cloudwatch_event_rule" "event_rule" {
  name                = var.task_name
  schedule_expression = var.cloudwatch_schedule_expression
}

// Failure notification configuration (using Cloudwatch)
// -----------------------------------------------------
// We create an event rule that sends a message to an SNS Topic every time the task fails with a non-0 error code
// We also configure the

resource "aws_cloudwatch_event_target" "ecs_scheduled_task" {
  rule      = aws_cloudwatch_event_rule.event_rule.name
  target_id = var.task_name
  arn       = var.ecs_cluster_arn
  role_arn  = aws_iam_role.cloudwatch_role.arn

  ecs_target {
    task_count          = 1
    task_definition_arn = aws_ecs_task_definition.this.arn
  }
}

# resource "aws_cloudwatch_event_rule" "task_failure" {
#   name        = "${var.task_name}-fail"
#   description = "Watch for ${var.task_name} tasks that exit with non zero exit codes"

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
#         "exitCode": [
#           {"anything-but": 0}
#         ]
#       },
#       "clusterArn": ["${var.ecs_cluster_arn}"],
#       "taskDefinitionArn": ["${aws_ecs_task_definition.this.arn}"]
#     }
#   }
#   EOF
# }

# resource "aws_sns_topic" "task_failure" {
#   name = "${var.task_name}-fail"
# }

# resource "aws_cloudwatch_event_target" "sns_target" {
#   rule  = aws_cloudwatch_event_rule.task_failure.name
#   arn   = aws_sns_topic.task_failure.arn
#   input = jsonencode({ "message" : "Task ${var.task_name} failed! Please check logs https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups/log-group/${var.task_name}" })
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

// IAM Resources
// -------------
// We create 2 IAM roles:
// 1. A Task Execution role used to run the ECS task and log output to cloudwatch.  This can be overridden by the user if they are using a
//    non-default ECSTaskExecutionRole.
// 2. A second role used by Cloudwatch to launch the ECS task when the timer is triggered
//
// Users can add a 3rd role if the ECS Task needs to access AWS resources.

// Task Execution Role
// Includes essential ecs access and cloudwatch logging permissions
data "aws_iam_policy_document" "task_execution_assume_role" {
  statement {
    principals {
      type = "Service"
      identifiers = [
        "ecs-tasks.amazonaws.com"
      ]
    }
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
  }
}

data "aws_iam_policy_document" "task_execution_cloudwatch_access" {
  statement {
    effect = "Allow"
    actions = [
      "logs:PutRetentionPolicy",
      "logs:CreateLogGroup"
    ]
    resources = ["arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group:${var.task_name}:*"]
  }
}

data "aws_iam_role" "task_execution_role" {
  count = var.ecs_task_execution_role_name != "" ? 1 : 0

  name = var.ecs_task_execution_role_name
}

locals {
  ecs_task_execution_role_arn  = var.ecs_task_execution_role_name != "" ? data.aws_iam_role.task_execution_role[0].arn : aws_iam_role.task_execution_role[0].arn
  ecs_task_execution_role_name = var.ecs_task_execution_role_name != "" ? data.aws_iam_role.task_execution_role[0].name : aws_iam_role.task_execution_role[0].name
}

resource "aws_iam_role" "task_execution_role" {
  count = var.ecs_task_execution_role_name == "" ? 1 : 0

  name               = "${var.task_name}-execution"
  assume_role_policy = data.aws_iam_policy_document.task_execution_assume_role.json
}

# resource "aws_iam_policy" "task_execution_logging_policy" {
#   name   = "${var.task_name}-logging"
#   policy = data.aws_iam_policy_document.task_execution_cloudwatch_access.json
# }

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  count = var.ecs_task_execution_role_name == "" ? 1 : 0

  role       = local.ecs_task_execution_role_name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# resource "aws_iam_role_policy_attachment" "ecs_task_execution_cloudwatch_access" {
#   role       = local.ecs_task_execution_role_name
#   policy_arn = aws_iam_policy.task_execution_logging_policy.arn
# }

// Cloudwatch execution role
data "aws_iam_policy_document" "cloudwatch_assume_role" {
  statement {
    principals {
      type = "Service"
      identifiers = [
        "events.amazonaws.com",
        "ecs-tasks.amazonaws.com",
      ]
    }
    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "cloudwatch" {

  statement {
    effect    = "Allow"
    actions   = ["ecs:RunTask"]
    resources = [aws_ecs_task_definition.this.arn]
  }
  statement {
    effect  = "Allow"
    actions = ["iam:PassRole"]
    resources = concat([
      local.ecs_task_execution_role_arn
    ], var.task_role_arn != null ? [var.task_role_arn] : [])
  }
}

resource "aws_iam_role" "cloudwatch_role" {
  name               = "${var.task_name}-role"
  assume_role_policy = data.aws_iam_policy_document.cloudwatch_assume_role.json

}

resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.cloudwatch_role.name
  policy_arn = aws_iam_policy.cloudwatch.arn
}

resource "aws_iam_policy" "cloudwatch" {
  name   = "${var.task_name}-policy"
  policy = data.aws_iam_policy_document.cloudwatch.json
}


# resource "aws_cloudwatch_event_rule" "task_ec2_failure" {
#   name        = "${var.task_name}-ec2"
#   description = "Something wrong with EC2, please restart ${var.task_name} tasks."

#   event_pattern = <<EOF
#   {
#     "source": [
#       "aws.ecs"
#     ],
#     "detail": {
#       "lastStatus": [
#         "STOPPED"
#       ],
#       "stoppedReason": [
#         { "prefix": "Host" } 
#       ],
#       "clusterArn": ["${var.ecs_cluster_arn}"],
#       "taskDefinitionArn": ["${aws_ecs_task_definition.this.arn}"]
#     }
#   }
#   EOF
# }


# resource "aws_sns_topic" "task_ec2_failure" {
#   name = "${var.app_name}-task-ec2-failure"
# }

# resource "aws_cloudwatch_event_target" "task_ec2_failure" {
#   rule  = aws_cloudwatch_event_rule.task_ec2_failure.name
#   arn   = aws_sns_topic.task_ec2_failure.arn
#   input = jsonencode({ "message" : "Something wrong with EC2, please restart ${var.task_name} tasks." })
# }

# data "aws_iam_policy_document" "task_ec2_failure" {

#   statement {
#     actions   = ["SNS:Publish"]
#     effect    = "Allow"
#     resources = [aws_sns_topic.task_ec2_failure.arn]

#     principals {
#       type        = "Service"
#       identifiers = ["events.amazonaws.com"]
#     }
#   }
# }

# resource "aws_sns_topic_policy" "task_ec2_failure" {
#   arn    = aws_sns_topic.task_ec2_failure.arn
#   policy = data.aws_iam_policy_document.task_ec2_failure.json
# }

# resource "aws_sns_topic_subscription" "lambda_alarm_health" {
#   topic_arn =  aws_sns_topic.task_ec2_failure.arn
#   protocol  = "lambda"
#   endpoint  =  var.lambda_endpoint
# }