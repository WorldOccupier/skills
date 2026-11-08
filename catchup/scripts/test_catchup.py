import unittest

from entries import ASSISTANT, SUMMARY, USER, Entry, tool_entry
from tail import TailLimits, select_tail
from transcript import user_entries

LOOSE_BUDGET = 100_000


def conversation(*roles: str) -> list[Entry]:
    return [Entry(role, f"{role} {index}") for index, role in enumerate(roles)]


class SelectTailTest(unittest.TestCase):
    def test_stops_after_the_requested_number_of_user_prompts(self):
        entries = conversation(USER, ASSISTANT, USER, ASSISTANT, USER, ASSISTANT)
        tail = select_tail(entries, TailLimits(user_prompts=2, characters=LOOSE_BUDGET))
        self.assertEqual(tail, entries[2:])

    def test_stops_at_the_latest_compaction_summary(self):
        entries = conversation(USER, SUMMARY, ASSISTANT, USER, ASSISTANT)
        tail = select_tail(entries, TailLimits(user_prompts=5, characters=LOOSE_BUDGET))
        self.assertEqual(tail, entries[1:])

    def test_stops_when_the_character_budget_is_spent(self):
        entries = [Entry(USER, "x" * 50), Entry(ASSISTANT, "y" * 50), Entry(ASSISTANT, "z" * 50)]
        tail = select_tail(entries, TailLimits(user_prompts=5, characters=60))
        self.assertEqual(tail, entries[1:])


class ToolEntryTest(unittest.TestCase):
    def test_records_the_file_only_for_editing_tools(self):
        self.assertEqual(tool_entry("Edit", {"file_path": "a.py"}).edited_file, "a.py")
        self.assertIsNone(tool_entry("Read", {"file_path": "a.py"}).edited_file)


class UserEntriesTest(unittest.TestCase):
    def test_keeps_agent_commands_and_drops_harness_commands(self):
        how = "<command-message>how</command-message>\n<command-name>/how</command-name>\n<command-args>does X work</command-args>"
        clear = "<command-name>/clear</command-name>\n<command-message>clear</command-message>\n<command-args></command-args>"
        self.assertEqual(user_entries(how), [Entry(USER, "/how does X work")])
        self.assertEqual(user_entries(clear), [])


if __name__ == "__main__":
    unittest.main()
