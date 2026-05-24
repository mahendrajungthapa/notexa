export default function Header() {
  return (
    <header className="flex justify-between mb-8">
      <div>
        <h2 className="text-3xl font-bold">Friends Circle</h2>
        <p className="text-gray-500">
          Manage your collaborators
        </p>
      </div>

      <input
        className="border p-2 rounded-xl"
        placeholder="Search..."
      />
    </header>
  );
}