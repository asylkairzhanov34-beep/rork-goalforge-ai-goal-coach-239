import SubscriptionScreen from '@/screens/SubscriptionScreen';
import { useSubscription } from '@/hooks/use-subscription-store';

export default function Subscription() {
  const { isFirstLaunch } = useSubscription();
  return <SubscriptionScreen skipButton={isFirstLaunch} />;
}
