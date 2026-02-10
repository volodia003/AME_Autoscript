import { Button, Card } from "pixel-retroui";

export function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-minecraft mb-4">Welcome to My Retro App</h1>
      <Card className="p-4 mb-4">
        <h2>This is a pixel-styled card</h2>
        <p>You can put anything inside!</p>
      </Card>
      <Button>Click me!</Button>
    </div>
  );
}
