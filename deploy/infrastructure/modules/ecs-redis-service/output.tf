output "aws_ecs_service_name" {
    value = aws_ecs_service.this_task_service.name
}

output "data" {
  value = data.template_file.task_definition_json.rendered
}