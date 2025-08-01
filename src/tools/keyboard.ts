/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';

import { defineTabTool } from './tool.js';
import { elementSchema } from './snapshot.js';
import { generateLocator } from './utils.js';
import * as javascript from '../javascript.js';

const pressKey = defineTabTool({
  capability: 'core',

  schema: {
    name: 'browser_press_key',
    title: 'Press a key',
    description: 'Press a key on the keyboard',
    inputSchema: z.object({
      key: z.string().describe('Name of the key to press or a character to generate, such as `ArrowLeft` or `a`'),
    }),
    type: 'destructive',
  },

  handle: async (tab, params, response) => {
    response.setIncludeSnapshot();
    response.addCode(`// Press ${params.key}`);
    response.addCode(`await page.keyboard.press('${params.key}');`);

    await tab.waitForCompletion(async () => {
      await tab.page.keyboard.press(params.key);
    });
  },
});

const typeSchema = elementSchema.extend({
  text: z.string().describe('Text to type into the element'),
  submit: z.boolean().optional().describe('Whether to submit entered text (press Enter after)'),
  slowly: z.boolean().optional().describe('Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once.'),
});

const type = defineTabTool({
  capability: 'core',
  schema: {
    name: 'browser_type',
    title: 'Type text',
    description: 'Type text into editable element',
    inputSchema: typeSchema,
    type: 'destructive',
  },

  handle: async (tab, params, response) => {
    const locator = await tab.refLocator(params);

    await tab.waitForCompletion(async () => {
      if (params.slowly) {
        response.setIncludeSnapshot();
        response.addCode(`// Press "${params.text}" sequentially into "${params.element}"`);
        response.addCode(`await page.${await generateLocator(locator)}.pressSequentially(${javascript.quote(params.text)});`);
        await locator.pressSequentially(params.text);
      } else {
        response.addCode(`// Fill "${params.text}" into "${params.element}"`);
        response.addCode(`await page.${await generateLocator(locator)}.fill(${javascript.quote(params.text)});`);
        await locator.fill(params.text);
      }

      if (params.submit) {
        response.setIncludeSnapshot();
        response.addCode(`await page.${await generateLocator(locator)}.press('Enter');`);
        await locator.press('Enter');
      }
    });
  },
});

export default [
  pressKey,
  type,
];
