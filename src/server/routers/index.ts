import { resourceReviewRouter } from './resourceReview.router';
import { postRouter } from './post.router';
import { router } from '~/server/trpc';
import { accountRouter } from './account.router';
import { announcementRouter } from './announcement.router';
import { answerRouter } from './answer.router';
import { apiKeyRouter } from './apiKey.router';
import { authRouter } from './auth.router';
import { commentRouter } from './comment.router';
import { commentv2Router } from './commentv2.router';
import { downloadRouter } from './download.router';
import { imageRouter } from './image.router';
import { modelFileRouter } from './model-file.router';
import { modelVersionRouter } from './model-version.router';
import { modelRouter } from './model.router';
import { notificationRouter } from './notification.router';
import { partnerRouter } from './partner.router';
import { questionRouter } from './question.router';
import { reactionRouter } from './reaction.router';
import { reportRouter } from './report.router';
import { reviewRouter } from './review.router';
import { stripeRouter } from './stripe.router';
import { moderationRouter } from '~/server/routers/moderation.router';
import { tagRouter } from './tag.router';
import { userLinkRouter } from './user-link.router';
import { userRouter } from './user.router';
import { contentRouter } from './content.router';

export const appRouter = router({
  account: accountRouter,
  announcement: announcementRouter,
  answer: answerRouter,
  apiKey: apiKeyRouter,
  auth: authRouter,
  comment: commentRouter,
  commentv2: commentv2Router,
  download: downloadRouter,
  image: imageRouter,
  model: modelRouter,
  modelFile: modelFileRouter,
  modelVersion: modelVersionRouter,
  notification: notificationRouter,
  partner: partnerRouter,
  question: questionRouter,
  reaction: reactionRouter,
  report: reportRouter,
  review: reviewRouter,
  stripe: stripeRouter,
  moderation: moderationRouter,
  tag: tagRouter,
  user: userRouter,
  userLink: userLinkRouter,
  post: postRouter,
  resourceReview: resourceReviewRouter,
  content: contentRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
