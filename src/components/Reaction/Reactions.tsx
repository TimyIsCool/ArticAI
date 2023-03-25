import { Button, Group, Popover, Text, PopoverProps, GroupProps } from '@mantine/core';
import { ReviewReactions } from '@prisma/client';
import { IconMoodSmile, IconPlus } from '@tabler/icons';
import { useCurrentUser } from '~/hooks/useCurrentUser';
import { ToggleReactionInput } from '~/server/schema/reaction.schema';
import { ReactionDetails } from '~/server/selectors/reaction.selector';
import { ReactionButton } from './ReactionButton';

export type ReactionMetrics = {
  likeCount?: number;
  dislikeCount?: number;
  heartCount?: number;
  laughCount?: number;
  cryCount?: number;
};

type ReactionToEmoji = { [k in ReviewReactions]: string };
const availableReactions: ReactionToEmoji = {
  [ReviewReactions.Like]: '👍',
  [ReviewReactions.Dislike]: '👎',
  [ReviewReactions.Heart]: '❤️',
  [ReviewReactions.Laugh]: '😂',
  [ReviewReactions.Cry]: '😢',
};

type ReactionsProps = Omit<ToggleReactionInput, 'reaction'> & {
  reactions: { userId: number; reaction: ReviewReactions }[];
  metrics?: ReactionMetrics;
  popoverPosition?: PopoverProps['position'];
  readonly?: boolean;
  withinPortal?: boolean;
};

export function Reactions({
  reactions,
  metrics = {},
  entityType,
  entityId,
  popoverPosition = 'top-start',
  readonly,
  withinPortal,
  ...groupProps
}: ReactionsProps & Omit<GroupProps, 'children' | 'onClick'>) {
  const currentUser = useCurrentUser();

  return (
    <Group
      spacing={4}
      align="center"
      onClick={(e) => {
        if (!readonly) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      {...groupProps}
    >
      <Popover
        shadow="md"
        position={popoverPosition}
        withArrow
        disabled={readonly}
        withinPortal={withinPortal}
      >
        <Popover.Target>
          <Button variant="subtle" size="xs" color="gray" radius="xl" compact>
            <Group spacing={2}>
              <IconPlus size={14} stroke={1.5} />
              <IconMoodSmile size={14} stroke={1.5} />
            </Group>
          </Button>
        </Popover.Target>
        <Popover.Dropdown p={4}>
          {currentUser ? (
            <ReactionsList
              reactions={reactions}
              metrics={metrics}
              entityType={entityType}
              entityId={entityId}
            >
              {ReactionSelector}
            </ReactionsList>
          ) : (
            <Text color="dimmed" size="xs" px="xs">
              You must be logged in to react
            </Text>
          )}
        </Popover.Dropdown>
      </Popover>

      <ReactionsList
        reactions={reactions}
        metrics={metrics}
        entityType={entityType}
        entityId={entityId}
        noEmpty
        readonly={readonly}
      >
        {ReactionBadge}
      </ReactionsList>
    </Group>
  );
}

function ReactionsList({
  reactions,
  metrics = {},
  entityType,
  entityId,
  available,
  children,
  noEmpty,
  readonly,
}: Omit<ReactionsProps, 'popoverPosition'> & {
  noEmpty?: boolean;
  available?: ReviewReactions[];
  children: (args: {
    hasReacted: boolean;
    count: number;
    reaction: ReviewReactions;
  }) => React.ReactElement;
  readonly?: boolean;
}) {
  const currentUser = useCurrentUser();
  const keys = Object.keys(availableReactions) as ReviewReactions[];
  return (
    <>
      {keys
        .filter((reaction) => (available ? available.includes(reaction) : true))
        .map((reaction) => {
          const reactionMetricType = `${reaction.toLowerCase()}Count` as keyof ReactionMetrics;
          const count = metrics[reactionMetricType] ?? 0;
          const userReaction = reactions.find(
            (x) => x.userId === currentUser?.id && x.reaction === reaction
          );
          return (
            <ReactionButton
              key={reaction}
              reaction={reaction}
              userReaction={userReaction}
              count={count}
              entityType={entityType}
              entityId={entityId}
              readonly={!currentUser || readonly}
              noEmpty={noEmpty}
            >
              {children}
            </ReactionButton>
          );
        })}
    </>
  );
}

function ReactionBadge({
  hasReacted,
  count,
  reaction,
}: {
  hasReacted: boolean;
  count: number;
  reaction: ReviewReactions;
}) {
  return (
    <Button size="xs" radius="xl" variant="light" color={hasReacted ? 'blue' : 'gray'} compact>
      <Group spacing={4} align="center">
        <Text inherit>{availableReactions[reaction]}</Text>
        <Text inherit>{count}</Text>
      </Group>
    </Button>
  );
}

function ReactionSelector({
  reaction,
  hasReacted,
}: {
  reaction: ReviewReactions;
  hasReacted: boolean;
}) {
  return (
    <Button size="xs" radius="sm" variant={'subtle'} color={hasReacted ? 'blue' : 'gray'}>
      {availableReactions[reaction]}
    </Button>
  );
}
