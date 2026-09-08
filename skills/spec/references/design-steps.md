# Spec · design steps (when the change has a screen)

Companion to step 3 of `cycle:spec`. Tool-agnostic: use whatever browser, capture and design tools the host offers.

a. **Visual reference.** Write the search prompt ("screenshots and images of <what it should look like>, in <context>") and run it in a browser. Save the path or link of each reference and a line on what to copy from it. Without a reference the mock comes out as the average of the internet.

b. **Existing screen as reference.** If the change touches a screen that already exists, capture it (screenshot or DOM clone) before designing. The current state is a constraint, not a suggestion.

c. **Design prompts.** One ready prompt per surface, written from the requirements and the references. It should be usable by a designer or a generation tool without this conversation.

d. **Mock before code.** Produce the mock (design canvas, static HTML, or an image) and let the user adjust it by hand. The approved mock is recorded by path under "Approved mock" in the spec and becomes the visual Proof of `plans/<x>.md`. A mock the user never approved is not Proof.
