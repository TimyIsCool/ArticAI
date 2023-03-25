import {
  ActionIcon,
  Button,
  Card,
  Group,
  Progress,
  Select,
  Stack,
  Text,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { Dropzone, FileWithPath } from '@mantine/dropzone';
import { randomId, useViewportSize } from '@mantine/hooks';
import { ModelType } from '@prisma/client';
import {
  IconBan,
  IconCircleCheck,
  IconCloudUpload,
  IconFileUpload,
  IconRefresh,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons';
import { MasonryScroller, useContainerPosition, usePositioner, useResizeObserver } from 'masonic';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { constants, ModelFileType } from '~/server/common/constants';
import { UploadType } from '~/server/common/enums';
import { ModelUpsertInput } from '~/server/schema/model.schema';
import { useS3UploadStore } from '~/store/s3-upload.store';
import { ModelById } from '~/types/router';
import { showErrorNotification } from '~/utils/notifications';
import { formatBytes, formatSeconds } from '~/utils/number-helpers';
import { getFileExtension } from '~/utils/string-helpers';
import { trpc } from '~/utils/trpc';

type ZodErrorSchema = { _errors: string[] };
type SchemaError = {
  type?: ZodErrorSchema;
  modelSize?: ZodErrorSchema;
  floatingPoint?: ZodErrorSchema;
};

type DropzoneOptions = {
  acceptedFileTypes: string[];
  acceptedModelFiles: ModelFileType[];
  maxFiles: number;
};

const dropzoneOptionsByModelType: Record<ModelType, DropzoneOptions> = {
  Checkpoint: {
    acceptedFileTypes: ['.ckpt', '.pt', '.safetensors', '.bin', '.zip', '.yaml', '.yml'],
    acceptedModelFiles: ['Model', 'Config', 'VAE', 'Training Data'],
    maxFiles: 11,
  },
  LORA: {
    acceptedFileTypes: ['.ckpt', '.pt', '.safetensors', '.bin', '.zip'],
    acceptedModelFiles: ['Model', 'Text Encoder', 'Training Data'],
    maxFiles: 3,
  },
  LoCon: {
    acceptedFileTypes: ['.ckpt', '.pt', '.safetensors', '.bin', '.zip'],
    acceptedModelFiles: ['Model', 'Text Encoder', 'Training Data'],
    maxFiles: 3,
  },
  TextualInversion: {
    acceptedFileTypes: ['.ckpt', '.pt', '.safetensors', '.bin', '.zip'],
    acceptedModelFiles: ['Model', 'Negative', 'Training Data'],
    maxFiles: 3,
  },
  Hypernetwork: {
    acceptedFileTypes: ['.ckpt', '.pt', '.safetensors', '.bin', '.zip'],
    acceptedModelFiles: ['Model', 'Training Data'],
    maxFiles: 2,
  },
  AestheticGradient: {
    acceptedFileTypes: ['.ckpt', '.pt', '.safetensors', '.bin', '.zip'],
    acceptedModelFiles: ['Model', 'Training Data'],
    maxFiles: 2,
  },
  Controlnet: {
    acceptedFileTypes: ['.ckpt', '.pt', '.safetensors', '.bin'],
    acceptedModelFiles: ['Model'],
    maxFiles: 2,
  },
  Poses: { acceptedFileTypes: ['.zip'], acceptedModelFiles: ['Archive'], maxFiles: 1 },
  Other: { acceptedFileTypes: ['.zip'], acceptedModelFiles: ['Archive'], maxFiles: 1 },
  Wildcards: { acceptedFileTypes: ['.zip'], acceptedModelFiles: ['Archive'], maxFiles: 1 },
};

const metadataSchema = z
  .object({
    versionId: z.number(),
    type: z.enum(constants.modelFileTypes),
    modelSize: z.enum(['Full', 'Pruned']).nullish(),
    floatingPoint: z.enum(['fp16', 'fp32']).nullish(),
  })
  .refine((data) => (data.type === 'Model' ? !!data.modelSize : true), {
    message: 'Model size is required for model files',
    path: ['modelSize'],
  })
  .refine((data) => (data.type === 'Model' ? !!data.floatingPoint : true), {
    message: 'Floating point is required for model files',
    path: ['floatingPoint'],
  })
  .array();

export function Files({ model, version }: Props) {
  const theme = useMantineTheme();
  const { items, upload, setItems } = useS3UploadStore();

  const versionFiles = items.filter((item) => item.meta?.versionId === version?.id);

  const masonryRef = useRef(null);
  const { width, height } = useViewportSize();
  const { offset, width: containerWidth } = useContainerPosition(masonryRef, [width, height]);
  const positioner = usePositioner(
    {
      width: containerWidth,
      maxColumnCount: 2,
      columnGutter: theme.spacing.md,
    },
    [versionFiles.length]
  );
  const resizeObserver = useResizeObserver(positioner);

  const [error, setError] = useState<SchemaError[] | null>(null);

  const createFileMutation = trpc.modelFile.create.useMutation({
    onSuccess(result) {
      setItems((items) =>
        items.map((item) => (item.id === result.id ? { ...item, id: result.id } : item))
      );
    },
    onError(error) {
      showErrorNotification({
        title: 'Failed to create file',
        reason: 'Could not upload file, please try again.',
        error: new Error(error.message),
      });
    },
  });
  const handleStartUpload = async (files: TrackedFile[]) => {
    const validation = metadataSchema.safeParse(versionFiles.map((item) => item.meta));

    if (!validation.success) {
      const errors = validation.error.format() as unknown as Array<{ [k: string]: ZodErrorSchema }>;
      setError(errors);
      return showErrorNotification({ error: validation.error });
    }

    await Promise.all(
      files.map(({ file, meta }) => {
        const type = meta?.type === 'Model' ? UploadType.Model : UploadType.Default;

        return upload({ file, type, meta }, ({ meta, size, ...result }) => {
          const { versionId, type } = meta as { versionId: number; type: ModelFileType };
          if (versionId)
            createFileMutation.mutate({
              ...result,
              sizeKB: size,
              modelVersionId: versionId,
              type,
            });
        });
      })
    );
  };

  const handleDrop = async (droppedFiles: FileWithPath[]) => {
    setError(null);
    setItems((current) => [
      ...current,
      ...droppedFiles.map((file) => ({
        file,
        name: file.name,
        size: file.size ?? 0,
        status: 'pending' as const,
        uploaded: 0,
        progress: 0,
        speed: 0,
        timeRemaining: 0,
        abort: () => undefined,
        uuid: randomId(),
        meta: { versionId: version?.id },
      })),
    ]);
  };

  useEffect(() => {
    if (version?.files && version.files.length > 0)
      setItems(
        () =>
          version?.files.map(({ id, sizeKB, name, type }) => ({
            id,
            name,
            size: sizeKB,
            uuid: randomId(),
            progress: 0,
            uploaded: 0,
            timeRemaining: 0,
            speed: 0,
            status: 'success' as const,
            abort: () => undefined,
            meta: { versionId: version?.id, type },
            file: new File([], name),
          })) ?? []
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version?.files]);

  const { acceptedModelFiles, acceptedFileTypes, maxFiles } =
    dropzoneOptionsByModelType[model?.type ?? 'Checkpoint'];

  return (
    <Stack>
      <Dropzone
        accept={{ 'application/octet-stream': acceptedFileTypes }}
        onDrop={handleDrop}
        maxFiles={maxFiles}
      >
        <Group position="center" spacing="xl" style={{ minHeight: 120, pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload
              size={50}
              stroke={1.5}
              color={theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 4 : 6]}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              size={50}
              stroke={1.5}
              color={theme.colors.red[theme.colorScheme === 'dark' ? 4 : 6]}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconFileUpload size={50} stroke={1.5} />
          </Dropzone.Idle>

          <Stack spacing={8}>
            <Text size="xl" inline>
              Drop your files here or click to select
            </Text>
            <Text size="sm" color="dimmed" inline>
              {`Attach up to ${maxFiles} files. Accepted file types: ${acceptedFileTypes.join(
                ', '
              )}`}
            </Text>
          </Stack>
        </Group>
      </Dropzone>
      {versionFiles.length > 0 ? (
        <Button
          onClick={() =>
            handleStartUpload(versionFiles.filter((item) => item.status === 'pending'))
          }
          size="lg"
          fullWidth
        >
          Start Upload
        </Button>
      ) : null}
      <MasonryScroller
        containerRef={masonryRef}
        positioner={positioner}
        resizeObserver={resizeObserver}
        offset={offset}
        height={height}
        items={versionFiles}
        render={({ data, index }) => (
          <FileCard
            key={data.uuid}
            file={data}
            fileTypes={acceptedModelFiles}
            modelId={model?.id}
            error={error?.[index]}
            onRetry={handleStartUpload}
          />
        )}
      />
    </Stack>
  );
}

type Props = {
  model?: ModelUpsertInput;
  version?: ModelById['modelVersions'][number];
};

type FileStatus = 'success' | 'pending' | 'error' | 'aborted';
const mapStatusLabel: Record<FileStatus, React.ReactNode> = {
  pending: (
    <>
      <IconCloudUpload />
      <Text size="sm">Pending upload</Text>
    </>
  ),
  error: (
    <>
      <IconBan color="red" />
      <Text size="sm">Failed to upload</Text>
    </>
  ),
  aborted: (
    <>
      <IconBan color="red" />
      <Text size="sm">Aborted upload</Text>
    </>
  ),
  success: (
    <>
      <IconCircleCheck color="green" />
      <Text size="sm">Success</Text>
    </>
  ),
};

function FileCard({ file, fileTypes, error, modelId, onRetry }: FileCardProps) {
  const theme = useMantineTheme();
  const queryUtils = trpc.useContext();
  const clear = useS3UploadStore((state) => state.clear);
  const abort = useS3UploadStore((state) => state.abort);
  const updateMeta = useS3UploadStore((state) => state.updateMeta);

  const { uuid, status, name, progress, timeRemaining, speed, meta } = file;
  const { type, modelSize, floatingPoint } = meta as {
    versionId: number;
    type: ModelFileType;
    modelSize?: 'Full' | 'Pruned';
    floatingPoint?: 'fp16' | 'fp32';
  };
  const failedUpload = status === 'error' || status === 'aborted';

  const deleteFileMutation = trpc.modelFile.delete.useMutation({
    async onSuccess() {
      if (modelId) await queryUtils.model.getById.invalidate({ id: modelId });
    },
    onError() {
      showErrorNotification({
        error: new Error('Could not delete file, please try again'),
      });
    },
  });
  const handleRemoveFile = async (file: TrackedFile) => {
    if (file.id) await deleteFileMutation.mutateAsync({ id: file.id });
    clear((item) => item.uuid === file.uuid);
  };

  const filterByFileExtension = (value: ModelFileType) => {
    const extension = getFileExtension(file.name);

    switch (extension) {
      case 'ckpt':
      case 'safetensors':
        return ['Model', 'VAE'].includes(value);
      case 'pt':
        return ['Model', 'Negative', 'Text Encoder', 'VAE'].includes(value);
      case 'zip':
        return ['Training Data', 'Archive'].includes(value);
      case 'yml':
      case 'yaml':
        return ['Config'].includes(value);
      case 'bin':
        return ['Model', 'Negative'].includes(value);
      default:
        return true;
    }
  };

  return (
    <Card sx={{ opacity: deleteFileMutation.isLoading ? 0.2 : undefined }} withBorder>
      <Stack spacing={4} pb="xs">
        <Group position="apart" spacing={0} noWrap>
          <Text
            lineClamp={1}
            color={failedUpload ? 'red' : undefined}
            sx={{ display: 'inline-block' }}
          >
            {name}
          </Text>
          {status === 'uploading' && (
            <Tooltip label="Cancel upload" position="left">
              <ActionIcon color="red" onClick={() => abort(uuid)}>
                <IconX />
              </ActionIcon>
            </Tooltip>
          )}
          {(status === 'success' || status === 'pending') && (
            <Tooltip label="Remove file" position="left">
              <ActionIcon
                color="red"
                onClick={() => handleRemoveFile(file)}
                loading={deleteFileMutation.isLoading}
              >
                <IconTrash />
              </ActionIcon>
            </Tooltip>
          )}
          {failedUpload && (
            <Tooltip label="Retry upload" position="left">
              <ActionIcon color="blue" onClick={() => onRetry([file])}>
                <IconRefresh />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
        {['success', 'uploading'].includes(status) ? (
          <>
            <Stack spacing={0}>
              <Text size="sm" weight="bold">
                File Type
              </Text>
              <Text size="sm" color="dimmed">
                {type ?? 'undefined'}
              </Text>
            </Stack>
            {type === 'Model' ? (
              <>
                <Stack spacing={0}>
                  <Text size="sm" weight="bold">
                    Model size
                  </Text>
                  <Text size="sm" color="dimmed">
                    {modelSize ?? 'undefined'}
                  </Text>
                </Stack>
                <Stack spacing={0}>
                  <Text size="sm" weight="bold">
                    Floating point
                  </Text>
                  <Text size="sm" color="dimmed">
                    {floatingPoint ?? 'undefined'}
                  </Text>
                </Stack>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Select
              label="File Type"
              placeholder="Select a type"
              error={error?.type?._errors[0]}
              data={fileTypes.filter(filterByFileExtension)}
              value={type ?? null}
              onChange={(value: ModelFileType | null) => {
                updateMeta(file.uuid, (meta) => ({
                  ...meta,
                  type: value,
                  modelSize: null,
                  floatingPoint: null,
                }));
              }}
              withAsterisk
              withinPortal
            />
            {type === 'Model' && (
              <>
                <Select
                  label="Model Size"
                  placeholder="Pruned or Full"
                  data={['Full', 'Pruned']}
                  error={error?.modelSize?._errors[0]}
                  value={modelSize ?? null}
                  onChange={(value: 'Full' | 'Pruned' | null) => {
                    updateMeta(file.uuid, (meta) => ({ ...meta, modelSize: value }));
                  }}
                  withAsterisk
                  withinPortal
                />

                <Select
                  label="Floating Point"
                  placeholder="fp16 or fp32"
                  data={['fp16', 'fp32']}
                  error={error?.floatingPoint?._errors[0]}
                  value={floatingPoint ?? null}
                  onChange={(value: 'fp16' | 'fp32' | null) => {
                    updateMeta(file.uuid, (meta) => ({ ...meta, floatingPoint: value }));
                  }}
                  withAsterisk
                  withinPortal
                />
              </>
            )}
          </>
        )}
      </Stack>
      <Card.Section sx={{ display: 'flex' }} inheritPadding withBorder>
        <Group spacing="xs" py="md" sx={{ flex: 1 }}>
          {status === 'uploading' ? (
            <>
              <IconCloudUpload color={theme.colors.blue[theme.fn.primaryShade()]} />
              <Stack spacing={4} sx={{ flex: 1 }}>
                <Progress
                  size="xl"
                  radius="xs"
                  value={progress}
                  label={`${Math.floor(progress)}%`}
                  color={progress < 100 ? 'blue' : 'green'}
                  striped
                  animate
                />
                <Group position="apart" noWrap>
                  <Text color="dimmed" size="xs">{`${formatBytes(speed)}/s`}</Text>
                  <Text color="dimmed" size="xs">{`${formatSeconds(
                    timeRemaining
                  )} remaining`}</Text>
                </Group>
              </Stack>
            </>
          ) : (
            mapStatusLabel[status]
          )}
        </Group>
      </Card.Section>
    </Card>
  );
}

type FileCardProps = {
  file: TrackedFile;
  fileTypes: ModelFileType[];
  onRetry: (files: TrackedFile[]) => void;
  modelId?: number;
  error?: SchemaError;
};
