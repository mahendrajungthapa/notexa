export default function Sidebar() {
  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-white border-r p-4">
      <h1 className="text-xl font-bold text-indigo-600 mb-6">NotExA</h1>

      <ul className="space-y-3">
        <li className="text-gray-600">Home</li>
        <li className="text-indigo-600 font-semibold">Friends</li>
        <li>My Notes</li>
        <li>Shared</li>
        <li>Profile</li>
      </ul>
    </nav>
  );
}