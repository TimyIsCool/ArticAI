import { Container, Stack, Group } from '@mantine/core';
import PostsInfinite from '~/components/Post/Infinite/PostsInfinite';
import { SortFilter, PeriodFilter } from '~/components/Filters';
import { PostFiltersDropdown } from '~/components/Post/Infinite/PostFiltersDropdown';
import { HomeContentToggle } from '~/components/HomeContentToggle/HomeContentToggle';
import { hideMobile, showMobile } from '~/libs/sx-helpers';
import { Announcements } from '~/components/Announcements/Announcements';
import { PostCategories } from '~/components/Post/Infinite/PostCategories';
import { useFeatureFlags } from '~/providers/FeatureFlagsProvider';
import { NotFound } from '~/components/AppLayout/NotFound';

export default function PostsPage() {
  const features = useFeatureFlags();
  if (!features.posts) return <NotFound />;

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
            <SortFilter type="post" />
          </Group>
          <Group spacing={4}>
            <PeriodFilter />
            <PostFiltersDropdown />
          </Group>
        </Group>
        <PostCategories />
        <PostsInfinite />
      </Stack>
    </Container>
  );
}
