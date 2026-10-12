import { Stack } from 'expo-router';
import { strings } from '../../src/lib/strings';
export default function SessionLayout() { return <Stack><Stack.Screen name="index" options={{ title: strings.session.title }} /></Stack>; }
