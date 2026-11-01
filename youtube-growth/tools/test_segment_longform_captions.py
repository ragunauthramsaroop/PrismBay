import unittest
from pathlib import Path
import importlib.util

PATH=Path(__file__).with_name("segment_longform_captions.py")
spec=importlib.util.spec_from_file_location("caption_segmenter",PATH)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class LongformCaptionReviewTests(unittest.TestCase):
    def test_word_fidelity_and_bounds(self):
        text="A company processes six thousand invoices every month. A vendor offers an AI agent and promises to automate the entire queue. The finance team calculates eighteen thousand dollars in monthly labour cost."
        chunks=[(0,14500,text)]
        out=mod.transform(chunks)
        report=mod.verify(chunks,out)
        self.assertEqual(report["spokenWords"],len(text.split()))
        self.assertEqual(report["wordFidelity"],"EXACT_SCRIPT_MATCH")
        self.assertLessEqual(report["maxLineCharacters"],39)
        self.assertFalse(report["publicationApproved"])
    def test_nonoverlapping_and_full_duration(self):
        chunks=[(0,10000,"One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty."),(10000,20000,"The next paragraph includes nine words for the second caption segment.")]
        out=mod.transform(chunks)
        self.assertEqual(out[0][0],0)
        self.assertEqual(out[-1][1],20000)
        self.assertTrue(all(out[i][1]<=out[i+1][0] for i in range(len(out)-1)))
    def test_srt_timestamp_roundtrip(self):
        for t in [0,1234,60000,495574,3600001]:
            self.assertEqual(mod.ms(mod.fmt(t)),t)
    def test_fail_on_altered_word(self):
        chunks=[(0,5000,"one two three four five six seven eight nine")]
        out=mod.transform(chunks)
        a,b,lines=out[0]
        out[0]=(a,b,[lines[0].replace("one","none")]+lines[1:])
        with self.assertRaises(AssertionError):
            mod.verify(chunks,out)

if __name__=="__main__":
    unittest.main()
