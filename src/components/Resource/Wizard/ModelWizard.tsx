import {
  ActionIcon,
  Button,
  Container,
  createStyles,
  Group,
  Stack,
  Stepper,
  Title,
} from '@mantine/core';
import { useDidUpdate } from '@mantine/hooks';
import { IconX } from '@tabler/icons';
import { isEqual } from 'lodash';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { Files } from '~/components/Resource/Files';
import { ModelUpsertForm } from '~/components/Resource/Forms/ModelUpsertForm';
import { ModelVersionUpsertForm } from '~/components/Resource/Forms/ModelVersionUpsertForm';
import { ModelById } from '~/types/router';
import { trpc } from '~/utils/trpc';
import { isNumber } from '~/utils/type-guards';

type ModelWithTags = Omit<ModelById, 'tagsOnModels'> & {
  tagsOnModels: Array<{ id: number; name: string }>;
};

type WizardState = {
  step: number;
  model?: ModelWithTags;
  modelVersion?: ModelWithTags['modelVersions'][number];
};

const useStyles = createStyles((theme) => ({
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
}));

/**
 * TODO.posts: change routes when saving the model and version
 */
export function ModelWizard() {
  const { classes } = useStyles();
  const router = useRouter();

  const { id, step = '1' } = router.query;
  const parsedStep = Array.isArray(step) ? Number(step[0]) : Number(step);

  const [state, setState] = useState<WizardState>({
    step: isNumber(parsedStep) ? parsedStep : 1,
  });

  const { data: model } = trpc.model.getById.useQuery({ id: Number(id) }, { enabled: !!id });

  useDidUpdate(() => {
    router.replace(`/models/${id}/edit?step=${state.step}`, undefined, { shallow: true });
  }, [id, state.step]);

  useEffect(() => {
    if (model) {
      const parsedModel = {
        ...model,
        tagsOnModels: model.tagsOnModels.map(({ tag }) => tag) ?? [],
      };

      if (!isEqual(parsedModel, state.model))
        setState((current) => ({
          ...current,
          model: parsedModel,
          modelVersion: parsedModel.modelVersions.at(0),
        }));
    }
  }, [model, state.model]);

  const goNext = () => {
    if (state.step < 3) {
      setState((current) => ({
        ...current,
        step: current.step + 1,
      }));
    }
  };

  const goBack = () => {
    if (state.step > 1) {
      setState((current) => ({
        ...current,
        step: current.step - 1,
      }));
    }
  };

  const editing = !!model;

  return (
    <Container size="sm">
      <ActionIcon
        className={classes.closeButton}
        size="xl"
        radius="xl"
        variant="light"
        onClick={() => (editing ? router.push(`/models/${id}`) : router.back())}
      >
        <IconX />
      </ActionIcon>
      <Stack py="xl">
        <Stepper
          active={state.step - 1}
          onStepClick={(step) => setState((current) => ({ ...current, step: step + 1 }))}
          allowNextStepsSelect={false}
        >
          <Stepper.Step label={editing ? 'Edit model' : 'Create your model'}>
            <Stack>
              <Title order={3}>{editing ? 'Edit model' : 'Create your model'}</Title>
              <ModelUpsertForm
                model={state.model}
                onSubmit={({ id }) => {
                  if (editing) return goNext();

                  router.push(`/models/${id}/edit?step=2`);
                }}
              >
                {({ loading }) => (
                  <Group mt="xl" position="right">
                    <Button type="submit" loading={loading}>
                      Next
                    </Button>
                  </Group>
                )}
              </ModelUpsertForm>
            </Stack>
          </Stepper.Step>
          <Stepper.Step label={editing ? 'Edit version' : 'Add version'}>
            <Stack>
              <Title order={3}>{editing ? 'Edit version' : 'Add version'}</Title>
              <ModelVersionUpsertForm
                model={state.model}
                version={state.modelVersion}
                onSubmit={() => goNext()}
              >
                {({ loading }) => (
                  <Group mt="xl" position="right">
                    <Button variant="default" onClick={goBack}>
                      Back
                    </Button>
                    <Button type="submit" loading={loading}>
                      Next
                    </Button>
                  </Group>
                )}
              </ModelVersionUpsertForm>
            </Stack>
          </Stepper.Step>
          <Stepper.Step label="Upload files">
            <Stack>
              <Title order={3}>Upload files</Title>
              <Files model={state.model} version={state.modelVersion} />
            </Stack>
          </Stepper.Step>

          <Stepper.Completed>
            Completed, click back button to get to previous step
          </Stepper.Completed>
        </Stepper>
      </Stack>
    </Container>
  );
}
