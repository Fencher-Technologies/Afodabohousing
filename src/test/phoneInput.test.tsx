/**
 * The phone field must work for people outside Uganda.
 *
 * The business reported that "the drop down does not work" and that "a
 * foreigner is unable to create an account". Two defects caused that, and
 * these tests pin both so they cannot come back:
 *
 *   1. The country was re-derived from the typed digits on every render. An
 *      empty number carries no country, so choosing one before typing was
 *      discarded and the field snapped back to Uganda, after which a foreign
 *      number was saved as +256.
 *   2. 49 of the 242 countries share a dial code with another (+1 alone
 *      covers 25). Deriving the country always returned the first match, so
 *      Canada displayed as United States.
 */

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import { PhoneInput } from '@/components/ui/phone-input';
import { COUNTRIES, joinPhone, splitPhone } from '@/utils/countries';

/** Wrapper that holds the value, the way a real form does. */
function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <PhoneInput value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const trigger = () => screen.getByRole('combobox');
const numberBox = () => screen.getByRole('textbox');
const emitted = () => screen.getByTestId('value').textContent;

async function pickCountry(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(trigger());
  // Search first so the list narrows to one row, then click the option
  // itself: clicking the inner label does not reach the item's handler.
  await user.type(screen.getByPlaceholderText(/search country/i), name);
  const option = await screen.findByRole('option', { name: new RegExp(name, 'i') });
  await user.click(option);
}

describe('joinPhone and splitPhone', () => {
  it('drops a trunk zero for countries that use one', () => {
    const ug = COUNTRIES.find((c) => c.code === 'UG')!;
    expect(joinPhone(ug, '0752738927')).toBe('+256752738927');
  });

  it('keeps a leading zero where the national number genuinely has one', () => {
    const it_ = COUNTRIES.find((c) => c.code === 'IT')!;
    expect(joinPhone(it_, '0612345678')).toBe('+390612345678');
  });

  it('emits nothing for an empty number rather than a bare dial code', () => {
    const ke = COUNTRIES.find((c) => c.code === 'KE')!;
    expect(joinPhone(ke, '')).toBe('');
  });

  it('round-trips a foreign number', () => {
    expect(splitPhone('+254712345678').national).toBe('712345678');
    expect(splitPhone('+254712345678').country.dial).toBe('254');
  });
});

describe('PhoneInput', () => {
  it('defaults to Uganda so existing users are unaffected', () => {
    render(<Harness />);
    expect(trigger()).toHaveTextContent('+256');
  });

  it('keeps a country chosen before any digits are typed', async () => {
    // The headline bug: this used to revert to +256 immediately.
    const user = userEvent.setup();
    render(<Harness />);

    await pickCountry(user, 'Kenya');
    expect(trigger()).toHaveTextContent('+254');

    await user.type(numberBox(), '712345678');
    expect(emitted()).toBe('+254712345678');
  });

  it('does not rewrite a foreign number as Ugandan', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await pickCountry(user, 'Nigeria');
    await user.type(numberBox(), '8012345678');

    expect(emitted()).toBe('+2348012345678');
    expect(emitted()).not.toContain('+256');
  });

  it('holds a country that shares its dial code with another', async () => {
    // +1 covers 25 countries; deriving the country always showed the US.
    const user = userEvent.setup();
    render(<Harness />);

    await pickCountry(user, 'Canada');
    expect(trigger()).toHaveTextContent('+1');

    await user.type(numberBox(), '4165551234');
    expect(emitted()).toBe('+14165551234');
    // The selection must survive the value changing.
    expect(trigger()).toHaveTextContent('+1');
  });

  it('loads a saved foreign number with the right country', () => {
    render(<Harness initial="+971501234567" />);
    expect(trigger()).toHaveTextContent('+971');
    expect(numberBox()).toHaveValue('501234567');
  });

  it('can be searched, because 242 entries is too many to scroll', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(trigger());
    await user.type(screen.getByPlaceholderText(/search country/i), 'Rwanda');

    const list = await screen.findByRole('listbox');
    expect(within(list).getByText('Rwanda')).toBeInTheDocument();
  });

  it('finds a country by its dial code', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(trigger());
    await user.type(screen.getByPlaceholderText(/search country/i), '254');

    const list = await screen.findByRole('listbox');
    expect(within(list).getByText('Kenya')).toBeInTheDocument();
  });
});
