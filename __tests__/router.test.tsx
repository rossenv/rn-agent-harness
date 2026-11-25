import { renderRouter, screen, testRouter } from "expo-router/testing-library";
import { Text } from "react-native";

const Home = () => <Text>Home</Text>;
const Details = () => <Text>Details</Text>;

// Smoke test: proves Jest, jest-expo and Expo Router's test renderer work together.
describe("router test setup", () => {
  it("renders the first route and navigates to another", async () => {
    await renderRouter({ index: Home, details: Details });
    expect(screen.getByText("Home")).toBeOnTheScreen();

    await testRouter.push("/details");
    expect(screen).toHavePathname("/details");
    expect(screen.getByText("Details")).toBeOnTheScreen();
  });
});
