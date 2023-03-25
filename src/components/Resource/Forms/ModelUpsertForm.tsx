import { Alert, Grid, Group, Input, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { CheckpointType, CommercialUse, ModelType, TagTarget } from '@prisma/client';
import {
  IconCurrencyDollarOff,
  IconPhoto,
  IconBrush,
  IconShoppingCart,
  IconExclamationMark,
} from '@tabler/icons';
import { useEffect } from 'react';
import { z } from 'zod';

import {
  useForm,
  Form,
  InputText,
  InputSelect,
  InputSegmentedControl,
  InputRTE,
  InputTags,
  InputCheckbox,
} from '~/libs/form';
import { ModelUpsertInput, modelUpsertSchema } from '~/server/schema/model.schema';
import { showErrorNotification } from '~/utils/notifications';
import { splitUppercase } from '~/utils/string-helpers';
import { trpc } from '~/utils/trpc';

const schema = modelUpsertSchema.refine(
  (data) => (data.type === 'Checkpoint' ? !!data.checkpointType : true),
  {
    message: 'Please select the checkpoint type',
    path: ['checkpointType'],
  }
);

export function ModelUpsertForm({ model, children, onSubmit }: Props) {
  const defaultValues: ModelUpsertInput = {
    ...model,
    name: model?.name ?? '',
    status: model?.status ?? 'Draft',
    type: model?.type ?? 'Checkpoint',
    allowCommercialUse: model?.allowCommercialUse ?? CommercialUse.Sell,
    allowDerivatives: model?.allowDerivatives ?? true,
    allowNoCredit: model?.allowNoCredit ?? true,
    allowDifferentLicense: model?.allowDifferentLicense ?? true,
  };
  const form = useForm({ schema, defaultValues, shouldUnregister: false });
  const queryUtils = trpc.useContext();

  const [type, allowDerivatives] = form.watch(['type', 'allowDerivatives']);
  const nsfwPoi = form.watch(['nsfw', 'poi']);
  const { isDirty, errors } = form.formState;
  const editing = !!model;

  const handleModelTypeChange = (value: ModelType) => {
    form.setValue('checkpointType', null);
    switch (value) {
      case 'Checkpoint':
        form.setValue('checkpointType', CheckpointType.Merge);
        break;
      default:
        break;
    }
  };

  const upsertModelMutation = trpc.model.upsert.useMutation({
    onSuccess: async (data) => {
      await queryUtils.model.getById.invalidate({ id: data.id });
      onSubmit(data);
    },
    onError: (error) => {
      showErrorNotification({ error: new Error(error.message), title: 'Failed to save model' });
    },
  });
  const handleSubmit = (data: z.infer<typeof schema>) => {
    if (isDirty) upsertModelMutation.mutate(data);
    else onSubmit(defaultValues);
  };

  useEffect(() => {
    if (model) form.reset(model);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  return (
    <Form form={form} onSubmit={handleSubmit}>
      <Grid gutter="xl">
        <Grid.Col span={12}>
          <Stack>
            <InputText name="name" label="Name" placeholder="Name" withAsterisk />
            <Stack spacing={5}>
              <Group spacing="sm" grow>
                <InputSelect
                  name="type"
                  label="Type"
                  placeholder="Type"
                  data={Object.values(ModelType).map((type) => ({
                    label: splitUppercase(type),
                    value: type,
                  }))}
                  onChange={handleModelTypeChange}
                  disabled={editing}
                  withAsterisk
                />
                {type === 'Checkpoint' && (
                  <Input.Wrapper label="Checkpoint Type" withAsterisk>
                    <InputSegmentedControl
                      name="checkpointType"
                      data={Object.values(CheckpointType).map((type) => ({
                        label: splitUppercase(type),
                        value: type,
                      }))}
                      color="blue"
                      styles={(theme) => ({
                        root: {
                          border: `1px solid ${
                            errors.checkpointType
                              ? theme.colors.red[theme.fn.primaryShade()]
                              : theme.colorScheme === 'dark'
                              ? theme.colors.dark[4]
                              : theme.colors.gray[4]
                          }`,
                          background: 'none',
                          height: 36,
                        },
                        label: {
                          padding: '2px 10px',
                        },
                      })}
                      fullWidth
                    />
                  </Input.Wrapper>
                )}
              </Group>
              {errors.checkpointType && <Input.Error>{errors.checkpointType.message}</Input.Error>}
            </Stack>
            <InputTags
              name="tagsOnModels"
              label="Tags"
              description="Search or create tags for your model"
              target={[TagTarget.Model]}
            />
            <InputRTE
              name="description"
              label="About your model"
              description="Tell us what your model does"
              includeControls={['heading', 'formatting', 'list', 'link', 'media', 'mentions']}
              editorSize="xl"
            />
          </Stack>
        </Grid.Col>
        <Grid.Col span={12}>
          <Stack>
            <Paper radius="md" p="xl" withBorder>
              <Grid gutter="xs">
                <Grid.Col xs={12} sm={6}>
                  <Stack spacing="xs">
                    <Text size="md" weight={500} sx={{ lineHeight: 1.2 }} mb="xs">
                      {`When using this model, I give permission for users to:`}
                    </Text>
                    <InputCheckbox name="allowNoCredit" label="Use without crediting me" />
                    <InputCheckbox name="allowDerivatives" label="Share merges of this model" />
                    {allowDerivatives && (
                      <InputCheckbox
                        name="allowDifferentLicense"
                        label="Use different permissions on merges"
                      />
                    )}
                  </Stack>
                </Grid.Col>
                <Grid.Col xs={12} sm={6}>
                  <Stack spacing="xs">
                    <Text size="md" weight={500} sx={{ lineHeight: 1.2 }}>
                      Commercial Use
                    </Text>
                    <InputSegmentedControl
                      name="allowCommercialUse"
                      orientation="vertical"
                      fullWidth
                      color="blue"
                      styles={(theme) => ({
                        root: {
                          border: `1px solid ${
                            theme.colorScheme === 'dark'
                              ? theme.colors.dark[4]
                              : theme.colors.gray[4]
                          }`,
                          background: 'none',
                        },
                      })}
                      data={[
                        {
                          value: CommercialUse.None,
                          label: (
                            <Group>
                              <IconCurrencyDollarOff size={16} /> None
                            </Group>
                          ),
                        },
                        {
                          value: CommercialUse.Image,
                          label: (
                            <Group>
                              <IconPhoto size={16} /> Sell generated images
                            </Group>
                          ),
                        },
                        {
                          value: CommercialUse.Rent,
                          label: (
                            <Group>
                              <IconBrush size={16} /> Use on generation services
                            </Group>
                          ),
                        },
                        {
                          value: CommercialUse.Sell,
                          label: (
                            <Group>
                              <IconShoppingCart size={16} /> Sell this model or merges
                            </Group>
                          ),
                        },
                      ]}
                    />
                  </Stack>
                </Grid.Col>
              </Grid>
            </Paper>
            <Paper radius="md" p="xl" withBorder>
              <Stack>
                <Text size="md" weight={500}>
                  This model:
                </Text>
                <InputCheckbox
                  name="poi"
                  label="Depicts an actual person"
                  description="For Example: Tom Cruise or Tom Cruise as Maverick"
                />
                <InputCheckbox name="nsfw" label="Is for an adult audience (NSFW)" />
              </Stack>
            </Paper>
            {nsfwPoi.every((item) => item === true) && (
              <>
                <Alert color="red" pl={10}>
                  <Group noWrap spacing={10}>
                    <ThemeIcon color="red">
                      <IconExclamationMark />
                    </ThemeIcon>
                    <Text size="xs" sx={{ lineHeight: 1.2 }}>
                      NSFW content depicting actual people is not permitted.
                    </Text>
                  </Group>
                </Alert>
                <Text size="xs" color="dimmed" sx={{ lineHeight: 1.2 }}>
                  Please revise the content of this listing to ensure no actual person is depicted
                  in an NSFW context out of respect for the individual.
                </Text>
              </>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
      {typeof children === 'function'
        ? children({ loading: upsertModelMutation.isLoading })
        : children}
    </Form>
  );
}

type Props = {
  onSubmit: (data: ModelUpsertInput) => void;
  children: React.ReactNode | ((data: { loading: boolean }) => React.ReactNode);
  model?: ModelUpsertInput;
};
