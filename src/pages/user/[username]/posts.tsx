import { useRouter } from 'next/router';
import { PostDetail } from '~/components/Post/Detail/PostDetail';
import { useCurrentUser } from '~/hooks/useCurrentUser';

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

export default function UserPosts() {
  const router = useRouter();
  const username = router.query.username as string;
  const currentUser = useCurrentUser();
  const feature = useFeatureFlags();

  if (!feature.posts) return <NotFound />;

  return (
    <Container fluid style={{ maxWidth: 2500 }}>
      <PostsInfinite username={username} />
    </Container>
  );
}
