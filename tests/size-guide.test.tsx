import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Modal } from '../src/components/Modal';
import { SizeGuide, SIZE_NOTES, SIZE_ROWS } from '../src/components/SizeGuide';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div lang="fa" dir="rtl">
      <button type="button" onClick={() => setOpen(true)}>راهنمای سایز</button>
      {open && <Modal title="راهنمای سایز" onClose={() => setOpen(false)} labelId="guide-title" sheet><SizeGuide /></Modal>}
    </div>
  );
}

describe('size guide', () => {
  it('shows the approved chart, unit pill and the two measurement notes', async () => {
    const { container } = render(<div lang="fa" dir="rtl"><SizeGuide /></div>);
    expect(screen.getAllByText('سانتی‌متر')).toHaveLength(1);
    expect(screen.getByRole('columnheader', { name: 'سایز' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'دور سینه' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'دور کمر' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'دور باسن' })).toBeInTheDocument();
    const body = screen.getAllByRole('row').slice(1);
    expect(body).toHaveLength(SIZE_ROWS.length);
    SIZE_ROWS.forEach((r, i) => {
      expect(body[i]).toHaveTextContent(r.size);
      expect(body[i]).toHaveTextContent(r.chest);
      expect(body[i]).toHaveTextContent(r.waist);
      expect(body[i]).toHaveTextContent(r.hip);
    });
    for (const n of SIZE_NOTES) expect(screen.getByText(n)).toBeInTheDocument();
    expect(container.querySelectorAll('bdi[dir="ltr"]').length).toBe(SIZE_ROWS.length * 4);
    expect(screen.queryByText(/قد|دمپا|دور ران/)).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('opens as a dialog and closes with the button, Escape and the backdrop, restoring focus', () => {
    render(<Harness />);
    const open = screen.getByRole('button', { name: 'راهنمای سایز' });
    open.focus();
    fireEvent.click(open);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'guide-title');
    expect(screen.getByRole('heading', { name: 'راهنمای سایز' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'بستن' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(open);
    expect(document.body.style.overflow).toBe('');

    fireEvent.click(open);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(open);

    fireEvent.click(open);
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
