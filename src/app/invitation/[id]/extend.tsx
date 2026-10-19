import { useLocalSearchParams } from 'expo-router';

import { PurchaseScreen } from '../../../features/wallet/PurchaseScreen';

export default function ExtendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PurchaseScreen mode="extend" invitationId={id} />;
}
