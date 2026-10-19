import { useLocalSearchParams } from 'expo-router';

import { PurchaseScreen } from '../../../features/wallet/PurchaseScreen';

export default function ActivateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PurchaseScreen mode="activate" invitationId={id} />;
}
