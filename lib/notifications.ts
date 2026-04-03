import { prisma } from "./prisma";

type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_COMPLETED"
  | "MEMBER_JOINED"
  | "PROJECT_CREATED"
  | "INVITE_ACCEPTED"
  | "PAYMENT_FAILED"
  | "PAYMENT_SUCCESS"
  | "TASK_ASSIGNMENT_REQUEST";

interface CreateNotificationParams {
  userId: string;
  organizationId: string;
  type: NotificationType;
  message: string;
  link?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  return await prisma.notification.create({
    data: {
      userId: params.userId,
      organizationId: params.organizationId,
      type: params.type,
      message: params.message,
      link: params.link,
    },
  });
}
