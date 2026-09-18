"use client";

import { createOrgAction } from "../actions";

export function CreateOrganizationForm() {
  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h2 className="text-xl font-semibold mb-4">Create New Organization</h2>
      <form action={createOrgAction} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input type="text" name="name" required className="w-full border rounded p-2" placeholder="Acme Real Estate" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug (URL)</label>
          <input type="text" name="slug" required className="w-full border rounded p-2" placeholder="acme" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Primary Admin Email</label>
          <input type="email" name="adminEmail" className="w-full border rounded p-2" placeholder="admin@acme.com" />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Create Organization
        </button>
      </form>
    </div>
  );
}
