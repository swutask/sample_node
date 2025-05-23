const momentTimezone = require('moment-timezone');
const UserRepo = require('../repos/UserRepo');
const TaskRepo = require('../repos/TaskRepo');
const TeamMemberRepo = require('../repos/TeamMemberRepo');
const NotificationService = require('./NotificationService');
const NotificationCodes = require('../core/NotificationCodes');

class EmailTaskDeadlineNotificationProducerService {
  /**
   * @param hour {number}
   * @return {string[]}
   */
  static filterTimezoneNamesByHour (hour) {
    const now = momentTimezone();

    return momentTimezone.tz.names().filter(function (tz) {
      const tzNow = now.tz(tz);
      return tzNow.hour() === hour && tzNow.date() === now.date();
    });
  }

  static async run () {
    const timezoneNames = this.filterTimezoneNamesByHour(6);
    const userIds = await UserRepo.getIdsByTimezoneNamesWithInboxForTaskDeadLine(timezoneNames);

    if (!userIds) {
      return;
    }

    const teamMembers = await TeamMemberRepo.getAllByUserIds(userIds);

    if (!teamMembers) {
      return;
    }

    const teamMemberIds = teamMembers.map(teamMember => teamMember.id);
    const teamMemberIdUserIdMap = teamMembers.reduce((accumulator, teamMember) => {
      accumulator[teamMember.id] = teamMember.userId;

      return accumulator;
    }, {});

    const nowWithTimezone = momentTimezone.tz(timezoneNames[0]).toDate();
    const tasks = await TaskRepo.getAllByEndDateAndMemberIds(nowWithTimezone, teamMemberIds);

    for (const task of tasks) {
      const userId = teamMemberIdUserIdMap[task.teamMemberId];

      await NotificationService._create({
        category: 'personal',
        userId,
        targetUserId: userId,
        teamId: task.teamId,
        title: NotificationCodes.TASK_DEADLINE,
        taskId: task.id
      });
    }
  }
}

module.exports = EmailTaskDeadlineNotificationProducerService;
