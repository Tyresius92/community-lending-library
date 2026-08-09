import "@testing-library/jest-dom/vitest";

import { prisma } from "~/db.server";
import { initialize } from "~/generated/fabbrica";

initialize({ prisma });
