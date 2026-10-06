/**
 * PUT /api/leads/[id]/status — backwards-compatible alias for `PUT /api/leads/[id]`.
 *
 * This path was the only way to move a lead between Kanban columns before Task 16 §1 folded
 * assignment and follow-up into the same transaction. It is kept as a thin forwarder so an
 * open admin tab, a bookmark, or an in-flight deploy does not start 404ing. New callers should
 * use the parent path.
 */
export { PUT } from '../route';