output "user_data_rendered" {
    value      = data.template_file.user_data.rendered
    #sensitive  = true
}
