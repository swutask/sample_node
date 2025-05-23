module.exports = [
  {
    name: 'Trial Plan',
    provider: 'Stripe',
    data: null,
    maxSize: 53_687_091_200, // 50GB
    maxBooks: -1,
    maxProjects: -1,
    recurringPeriod: null,
    recurringPer: null,
    price: 0.00,
    pricePerMonth: 0.00,
    maxMembers: -1,
    maxClients: -1,
    singleFileSize: 524_288_000, // 500MB
    maxTasks: -1
  },
  {
    name: 'Pro Plan Yearly',
    provider: 'Stripe',
    data: { priceId: 'price_1PklFUA4o5qAFd3JFKn2nUK9' },
    maxSize: 53_687_091_200, // 50GB
    maxBooks: -1,
    maxProjects: -1,
    recurringPeriod: 1,
    recurringPer: 'year',
    price: 60,
    pricePerMonth: 5,
    maxMembers: -1,
    maxClients: -1,
    singleFileSize: 524_288_000, // 500MB
    maxTasks: -1
  },
  {
    name: 'Pro Plan Monthly',
    provider: 'Stripe',
    data: { priceId: 'price_1PutWRA4o5qAFd3JOOEWg4lY' },
    maxSize: 53_687_091_200, // 50GB
    maxBooks: -1,
    maxProjects: -1,
    recurringPeriod: 1,
    recurringPer: 'month',
    price: 6,
    pricePerMonth: 7,
    maxMembers: -1,
    maxClients: -1,
    singleFileSize: 524_288_000, // 500MB
    maxTasks: -1
  },
  {
    name: 'Free Plan',
    provider: 'Stripe',
    data: null,
    maxSize: 1_073_741_824, // 1GB
    maxBooks: -1,
    maxProjects: -1,
    recurringPeriod: null,
    recurringPer: null,
    price: 0.00,
    pricePerMonth: 0.00,
    maxMembers: -1,
    maxClients: -1,
    singleFileSize: 10_485_760, // 10MB
    maxTasks: 40
  },
  {
    name: 'Personal Pro Plan Yearly',
    provider: 'Stripe',
    data: { priceId: 'price_1QkOmNA4o5qAFd3JHVJbf8Er' },
    maxSize: 53_687_091_200, // 50GB
    maxBooks: -1,
    maxProjects: -1,
    recurringPeriod: 1,
    recurringPer: 'year',
    price: 48,
    pricePerMonth: 4,
    maxMembers: -1,
    maxClients: -1,
    singleFileSize: 524_288_000, // 500MB
    maxTasks: -1
  },
  {
    name: 'Personal Pro Plan Monthly',
    provider: 'Stripe',
    data: { priceId: 'price_1QkOn1A4o5qAFd3JXqHsk1bx' },
    maxSize: 53_687_091_200, // 50GB
    maxBooks: -1,
    maxProjects: -1,
    recurringPeriod: 1,
    recurringPer: 'month',
    price: 5,
    pricePerMonth: 5,
    maxMembers: -1,
    maxClients: -1,
    singleFileSize: 524_288_000, // 500MB
    maxTasks: -1
  },
  {
    name: 'Team Plan Yearly',
    provider: 'Stripe',
    data: { priceId: 'price_1QkOalA4o5qAFd3J1lwvbs8y' },
    maxSize: 375_809_638_400, // 350GB
    maxBooks: -1,
    maxProjects: -1,
    recurringPeriod: 1,
    recurringPer: 'year',
    price: 84,
    pricePerMonth: 7,
    maxMembers: -1,
    maxClients: -1,
    singleFileSize: 1_073_741_824, // 1GB
    maxTasks: -1
  },
  {
    name: 'Team Plan Monthly',
    provider: 'Stripe',
    data: { priceId: 'price_1QkOaBA4o5qAFd3Ju3OG1VTq' },
    maxSize: 375_809_638_400, // 350GB
    maxBooks: -1,
    maxProjects: -1,
    recurringPeriod: 1,
    recurringPer: 'month',
    price: 9,
    pricePerMonth: 9,
    maxMembers: -1,
    maxClients: -1,
    singleFileSize: 1_073_741_824, // 1GB
    maxTasks: -1
  }
];
