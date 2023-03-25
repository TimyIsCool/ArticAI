import { ImageDropzone } from '~/components/Image/ImageDropzone/ImageDropzone';
import { useEditPostContext, ImageUpload, ImageBlocked } from './EditPostProvider';
import {
  createStyles,
  Stack,
  Menu,
  ActionIcon,
  Group,
  Badge,
  Progress,
  Text,
  Card,
  Alert,
  Center,
  Popover,
  Code,
  BadgeProps,
  AspectRatio,
} from '@mantine/core';
import { EdgeImage } from '~/components/EdgeImage/EdgeImage';
import { Fragment, useState } from 'react';
import {
  IconDotsVertical,
  IconInfoCircle,
  IconTrash,
  IconX,
  IconExclamationMark,
  IconExclamationCircle,
  IconCheck,
} from '@tabler/icons';
import { DeleteImage } from '~/components/Image/DeleteImage/DeleteImage';
import { useCFUploadStore } from '~/store/cf-upload.store';
import { EditImageDrawer } from '~/components/Post/Edit/EditImageDrawer';
import { TagType } from '@prisma/client';
import { PostEditImage } from '~/server/controllers/post.controller';

export function EditPostImages() {
  const postId = useEditPostContext((state) => state.id);
  const modelVersionId = useEditPostContext((state) => state.modelVersionId);
  const upload = useEditPostContext((state) => state.upload);
  const images = useEditPostContext((state) => state.images);

  const handleDrop = async (files: File[]) => upload({ postId, modelVersionId }, files);

  return (
    <Stack>
      <ImageDropzone onDrop={handleDrop} count={images.length} max={50} />
      <Stack>
        {images.map(({ type, data }, index) => (
          <Fragment key={index}>
            {type === 'image' && <ImageController image={data} />}
            {type === 'upload' && <ImageUpload {...data} />}
            {type === 'blocked' && <ImageBlocked {...data} />}
          </Fragment>
        ))}
      </Stack>
      <EditImageDrawer />
    </Stack>
  );
}

function ImageController({
  image: {
    id,
    url,
    previewUrl,
    name,
    nsfw,
    width,
    height,
    hash,
    meta,
    generationProcess,
    needsReview,
    resourceHelper,
    tags,
  },
}: {
  image: PostEditImage;
}) {
  const { classes, cx } = useStyles();
  const [withBorder, setWithBorder] = useState(false);
  const removeImage = useEditPostContext((state) => state.removeImage);
  const setSelectedImageId = useEditPostContext((state) => state.setSelectedImageId);
  const handleSelectImageClick = () => setSelectedImageId(id);

  const generatedTags = tags?.filter((x) => x.type !== TagType.UserGenerated);

  return (
    <Card className={classes.container} withBorder={withBorder} p={0}>
      <EdgeImage
        src={previewUrl ?? url}
        alt={name ?? undefined}
        width={width ?? 1200}
        onLoad={() => setWithBorder(true)}
      />
      <>
        <Group className={cx(classes.footer, classes.content)} spacing={6} p="xs" position="right">
          {!!generatedTags.length && (
            <Badge {...readyBadgeProps} onClick={handleSelectImageClick}>
              Generated Tags
            </Badge>
          )}
          {meta ? (
            <Badge {...readyBadgeProps} onClick={handleSelectImageClick}>
              Generation Data
            </Badge>
          ) : (
            <Badge {...warningBadgeProps} onClick={handleSelectImageClick}>
              Missing Generation Data
            </Badge>
          )}
          {resourceHelper.length ? (
            <Badge {...readyBadgeProps} onClick={handleSelectImageClick}>
              Resources: {resourceHelper.length}
            </Badge>
          ) : (
            <Badge {...blockingBadgeProps} onClick={handleSelectImageClick}>
              Missing Resources
            </Badge>
          )}
        </Group>
        <Menu position="bottom-end">
          <Menu.Target>
            <ActionIcon size="lg" variant="transparent" p={0} className={classes.actions}>
              <IconDotsVertical
                size={24}
                color="#fff"
                style={{ filter: `drop-shadow(0 0 2px #000)` }}
              />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={handleSelectImageClick}>Edit image</Menu.Item>
            <DeleteImage imageId={id} onSuccess={(id) => removeImage(id)}>
              {({ onClick, isLoading }) => (
                <Menu.Item color="red" onClick={onClick}>
                  Delete image
                </Menu.Item>
              )}
            </DeleteImage>
          </Menu.Dropdown>
        </Menu>
      </>
    </Card>
  );
}

function ImageUpload({ url, name, uuid, status, message }: ImageUpload) {
  const { classes, cx } = useStyles();
  const items = useCFUploadStore((state) => state.items);
  const trackedFile = items.find((x) => x.meta.uuid === uuid);
  const removeFile = useEditPostContext((state) => state.removeFile);
  return (
    <Card className={classes.container} withBorder p={0}>
      <EdgeImage src={url} alt={name ?? undefined} />
      {status === 'uploading' && trackedFile && (
        <Card radius={0} p="sm" className={cx(classes.footer, classes.ambient)}>
          <Group noWrap>
            <Text>{trackedFile.status}</Text>
            <Progress
              sx={{ flex: 1 }}
              size="xl"
              value={trackedFile.progress}
              label={`${Math.floor(trackedFile.progress)}%`}
              color={trackedFile.progress < 100 ? 'blue' : 'green'}
              striped
              animate
            />
            {trackedFile.status === 'error' && (
              <ActionIcon color="red" onClick={() => removeFile(uuid)}>
                <IconX />
              </ActionIcon>
            )}
          </Group>
        </Card>
      )}
      {status === 'blocked' && (
        <>
          <ActionIcon
            className={classes.actions}
            onClick={() => removeFile(uuid)}
            color="red"
            variant="filled"
            size="xl"
          >
            <IconTrash />
          </ActionIcon>
          <Card className={classes.footer} radius={0} p={0}>
            <Alert color="red" radius={0}>
              <Center>
                <Group spacing={4}>
                  <Popover position="top" withinPortal withArrow>
                    <Popover.Target>
                      <ActionIcon>
                        <IconInfoCircle />
                      </ActionIcon>
                    </Popover.Target>
                    <Popover.Dropdown>
                      <Stack spacing={0}>
                        <Text size="xs" weight={500}>
                          Blocked for
                        </Text>
                        <Code color="red">{message}</Code>
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>
                  <Text>TOS Violation</Text>
                </Group>
              </Center>
            </Alert>
          </Card>
        </>
      )}
    </Card>
  );
}

function ImageBlocked({ blockedFor, tags, uuid }: ImageBlocked) {
  const { classes, cx } = useStyles();
  const removeFile = useEditPostContext((state) => state.removeFile);
  return (
    <Card className={classes.container} withBorder p={0}>
      <Alert
        color="red"
        styles={{ label: { width: '100%' } }}
        title={
          <Group noWrap position="apart" sx={{ width: '100%' }}>
            <Group spacing={4} noWrap>
              <Popover position="top" withinPortal withArrow width={300}>
                <Popover.Target>
                  <ActionIcon>
                    <IconInfoCircle />
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack spacing="xs">
                    <Text size="xs" weight={500}>
                      Blocked for
                    </Text>
                    <Code color="red">{blockedFor}</Code>
                    <Group spacing="xs">
                      {tags
                        ?.filter((x) => x.type === 'Moderation')
                        .map((x) => (
                          <Badge key={x.name} color="red">
                            {x.name}
                          </Badge>
                        ))}
                    </Group>
                  </Stack>
                </Popover.Dropdown>
              </Popover>
              <Text>TOS Violation</Text>
            </Group>
            <ActionIcon color="red" onClick={() => removeFile(uuid)}>
              <IconX />
            </ActionIcon>
          </Group>
        }
      >
        <Text>
          The image you uploaded was determined to violate our TOS and has been completely removed
          from our service
        </Text>
      </Alert>
    </Card>
  );
}

const useStyles = createStyles((theme) => {
  return {
    container: {
      position: 'relative',
      background: theme.colors.dark[9],
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: 100,
    },
    actions: {
      position: 'absolute',
      top: theme.spacing.sm,
      right: theme.spacing.sm,
    },
    header: {
      position: 'absolute',
      top: 0,
      right: 0,
      left: 0,
    },
    floatingBadge: {
      color: 'white',
      backdropFilter: 'blur(7px)',
      boxShadow: '1px 2px 3px -1px rgba(37,38,43,0.2)',
    },
    content: {
      background: theme.fn.gradient({
        from: 'rgba(37,38,43,0.8)',
        to: 'rgba(37,38,43,0)',
        deg: 0,
      }),
      backdropFilter: 'blur(13px) saturate(160%)',
      boxShadow: '0 -2px 6px 1px rgba(0,0,0,0.16)',
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: 0,
    },
    ambient: {
      backgroundColor: theme.fn.rgba(theme.colorScheme === 'dark' ? '#000' : '#fff', 0.5),
    },
  };
});

const sharedBadgeProps: Partial<BadgeProps> = {
  sx: () => ({ cursor: 'pointer' }),
};

const readyBadgeProps: Partial<BadgeProps> = {
  ...sharedBadgeProps,
  color: 'green',
  leftSection: (
    <Center>
      <IconCheck size={16} />
    </Center>
  ),
};

const warningBadgeProps: Partial<BadgeProps> = {
  ...sharedBadgeProps,
  color: 'yellow',
  leftSection: (
    <Center>
      <IconExclamationMark size={16} />
    </Center>
  ),
};

const blockingBadgeProps: Partial<BadgeProps> = {
  ...sharedBadgeProps,
  color: 'red',
  leftSection: (
    <Center>
      <IconExclamationCircle size={16} />
    </Center>
  ),
};
