import type { Preview } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";

import "../app/components/_global_styles/css_reset.css";
import "../app/components/_global_styles/colors.css";
import "../app/components/_global_styles/space.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default preview;
