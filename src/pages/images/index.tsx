import { Container, Stack, Group } from '@mantine/core';
import { SortFilter, PeriodFilter } from '~/components/Filters';
import { HomeContentToggle } from '~/components/HomeContentToggle/HomeContentToggle';
import { hideMobile, showMobile } from '~/libs/sx-helpers';
import { Announcements } from '~/components/Announcements/Announcements';
import ImagesInfinite from '~/components/Image/Infinite/ImagesInfinite';
import { ImageCategories } from '~/components/Image/Infinite/ImageCategories';
import { useFeatureFlags } from '~/providers/FeatureFlagsProvider';
import { NotFound } from '~/components/AppLayout/NotFound';
import { ImageFiltersDropdown } from '~/components/Image/Infinite/ImageFiltersDropdown';

export default function ImagesPage() {
  const features = useFeatureFlags();
  if (!features.gallery) return <NotFound />;

  return (
    <Container size="xl">
      <Stack spacing="xs">
        <Announcements
          sx={(theme) => ({
            marginBottom: -35,
            [theme.fn.smallerThan('md')]: {
              marginBottom: -5,
            },
          })}
        />
        <HomeContentToggle sx={showMobile} />
        <Group position="apart" spacing={0}>
          <Group>
            <HomeContentToggle sx={hideMobile} />
            <SortFilter type="image" />
          </Group>
          <Group spacing={4}>
            <PeriodFilter />
            <ImageFiltersDropdown />
          </Group>
        </Group>
        <ImageCategories />
        <ImagesInfinite />
      </Stack>
    </Container>
  );
}
