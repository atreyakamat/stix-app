import { router } from "expo-router";
import { Empty, Screen } from "@/ui/kit";

export default function NotFound() {
  return (
    <Screen>
      <Empty icon="search" title="This page isn't in the app" body="It may be on the website instead." action="Go home" onAction={() => router.replace("/")} />
    </Screen>
  );
}
